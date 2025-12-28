using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface ISalesDocumentService
    {
        Task<int> CreateAsync(CreateSalesDocumentDto dto, CancellationToken ct = default);
        Task<POSFinalizationResponseDto> FinalizePOSTransactionAsync(POSFinalizationDto dto, CancellationToken ct = default);
        Task<GetSalesDocumentDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PagedResult<GetSalesDocumentListItemDto>> GetAllAsync(
            SalesDocumentType? type = null,
            int? clientId = null,
            DateTimeOffset? from = null,
            DateTimeOffset? to = null,
            string? q = null,
            string? paymentType = null,
            decimal? minAmount = null,
            decimal? maxAmount = null,
            string? orderBy = null,
            string? sortDirection = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default);
        Task UpdateHeaderAsync(int id, UpdateSalesDocumentDto dto, CancellationToken ct = default);
    }

    public class SalesDocumentService : ISalesDocumentService
    {
        private readonly AppDbContext _db;
        public SalesDocumentService(AppDbContext db) => _db = db;

        // --- CREATE DOCUMENT ---
        public async Task<int> CreateAsync(CreateSalesDocumentDto dto, CancellationToken ct = default)
        {
            // basic validations
            if (dto.Items is null || dto.Items.Count == 0)
                throw new ArgumentException("Document must contain at least one item.", nameof(dto.Items));

            if ((dto.DocumentType == SalesDocumentType.InvoicePersonal || dto.DocumentType == SalesDocumentType.InvoiceCompany)
                && dto.ClientId is null)
                throw new ArgumentException("ClientId is required for invoices.", nameof(dto.ClientId));

            var exists = await _db.SalesDocuments
                .AnyAsync(x => x.DocumentType == dto.DocumentType && x.DocumentNumber == dto.DocumentNumber, ct);
            if (exists) throw new InvalidOperationException("DocumentNumber already exists for this DocumentType.");

            // fetch tax rates
            var taxRateIds = dto.Items.Select(i => i.TaxRateId).Distinct().ToList();
            var taxRates = await _db.TaxRates
                .Where(t => taxRateIds.Contains(t.Id) && t.IsActive)
                .ToDictionaryAsync(t => t.Id, ct);

            // verify products exist
            var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
            var productExists = await _db.Products
                .Where(p => productIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync(ct);
            var missingProducts = productIds.Except(productExists).ToList();
            if (missingProducts.Count > 0)
                throw new ArgumentException($"Products not found: {string.Join(",", missingProducts)}", nameof(dto.Items));

            // create document
            var doc = new SalesDocument
            {
                DocumentType = dto.DocumentType,
                IssueDate = dto.IssueDate,
                Description = dto.Description,
                DocumentNumber = dto.DocumentNumber.Trim(),
                ClientId = dto.ClientId,
                Items = new List<SalesDocumentItem>(),
                Payments = new List<SalesPayment>()
            };

            // calculate totals
            decimal totalNet = 0m, totalTax = 0m, totalGross = 0m;

            foreach (var i in dto.Items)
            {
                if (!taxRates.ContainsKey(i.TaxRateId))
                    throw new ArgumentException($"TaxRateId {i.TaxRateId} not found or inactive.", nameof(dto.Items));

                var vat = taxRates[i.TaxRateId].Rate;
                var lineNet = Round2(i.UnitPriceNet * i.Quantity);
                var lineTax = Round2(lineNet * vat);
                var lineGross = Round2(lineNet + lineTax);

                doc.Items.Add(new SalesDocumentItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    ProductSKU = i.ProductSKU,
                    Quantity = i.Quantity,
                    UnitPriceNet = Round4(i.UnitPriceNet),
                    TaxRateId = i.TaxRateId,
                    FromLocationId = i.FromLocationId,
                    LineNet = lineNet,
                    LineTax = lineTax,
                    LineGross = lineGross
                });

                totalNet += lineNet;
                totalTax += lineTax;
                totalGross += lineGross;
            }

            foreach (var p in dto.Payments)
            {
                doc.Payments.Add(new SalesPayment
                {
                    PaymentOption = p.PaymentOption,
                    Amount = Round2(p.Amount),
                    AmountTendered = p.AmountTendered.HasValue ? Round2(p.AmountTendered.Value) : null,
                    Change = p.Change.HasValue ? Round2(p.Change.Value) : null
                });
            }

            if (doc.Payments.Count > 0)
            {
                var paid = doc.Payments.Sum(x => x.Amount);
                if (paid != totalGross)
                    throw new InvalidOperationException($"Sum of payments ({paid:F2}) must equal document TotalGross ({totalGross:F2}).");
            }

            doc.TotalNet = Round2(totalNet);
            doc.TotalTax = Round2(totalTax);
            doc.TotalGross = Round2(totalGross);

            _db.SalesDocuments.Add(doc);
            await _db.SaveChangesAsync(ct);

            return doc.Id;
        }

        // --- GET DOCUMENT BY ID---
        public async Task<GetSalesDocumentDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var doc = await _db.SalesDocuments
                .AsNoTracking()
                .Include(d => d.Items).ThenInclude(i => i.TaxRate)
                .Include(d => d.Items).ThenInclude(i => i.FromLocation)
                .Include(d => d.Payments)
                .FirstOrDefaultAsync(d => d.Id == id, ct);

            if (doc is null) return null;

            return new GetSalesDocumentDto
            {
                Id = doc.Id,
                DocumentType = doc.DocumentType,
                IssueDate = doc.IssueDate,
                Description = doc.Description,
                DocumentNumber = doc.DocumentNumber,
                ClientId = doc.ClientId,
                TotalNet = doc.TotalNet,
                TotalTax = doc.TotalTax,
                TotalGross = doc.TotalGross,
                Items = doc.Items.Select(i => new GetSalesDocumentItemDto
                {
                    Id = i.Id,
                    SalesDocumentId = i.SalesDocumentId,
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    ProductSKU = i.ProductSKU,
                    Quantity = i.Quantity,
                    UnitPriceNet = i.UnitPriceNet,
                    TaxRateId = i.TaxRateId,
                    TaxCode = i.TaxRate.Code,
                    LineNet = i.LineNet,
                    LineTax = i.LineTax,
                    LineGross = i.LineGross,
                    FromLocationId = i.FromLocationId,
                    FromLocationCode = i.FromLocation?.LocationCode
                }).ToList(),
                Payments = doc.Payments.Select(p => new GetSalesPaymentDto
                {
                    Id = p.Id,
                    SalesDocumentId = p.SalesDocumentId,
                    PaymentOption = p.PaymentOption,
                    Amount = p.Amount,
                    AmountTendered = p.AmountTendered,
                    Change = p.Change
                }).ToList()
            };
        }

        // --- GET ALL DOCUMENTS (pagination and filters) ---
        public async Task<PagedResult<GetSalesDocumentListItemDto>> GetAllAsync(
            SalesDocumentType? type = null,
            int? clientId = null,
            DateTimeOffset? from = null,
            DateTimeOffset? to = null,
            string? q = null,
            string? paymentType = null,
            decimal? minAmount = null,
            decimal? maxAmount = null,
            string? orderBy = null,
            string? sortDirection = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default)
        {
            pagination ??= new PaginationParams();

            var qry = _db.SalesDocuments
                .AsNoTracking()
                .Include(d => d.Items)
                .Include(d => d.Payments)
                .AsQueryable();

            if (type.HasValue)
                qry = qry.Where(d => d.DocumentType == type.Value);

            if (clientId.HasValue)
                qry = qry.Where(d => d.ClientId == clientId.Value);

            if (from.HasValue)
                qry = qry.Where(d => d.IssueDate >= from.Value);

            if (to.HasValue)
                qry = qry.Where(d => d.IssueDate <= to.Value);

            if (minAmount.HasValue)
                qry = qry.Where(d => d.TotalGross >= minAmount.Value);

            if (maxAmount.HasValue)
                qry = qry.Where(d => d.TotalGross <= maxAmount.Value);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                qry = qry.Where(d => d.DocumentNumber.ToLower().Contains(term));
            }

            // Filter by payment type
            if (!string.IsNullOrWhiteSpace(paymentType))
            {
                if (paymentType.Equals("Mix", StringComparison.OrdinalIgnoreCase))
                {
                    // Mix means multiple payment types
                    qry = qry.Where(d => d.Payments.Select(p => p.PaymentOption).Distinct().Count() > 1);
                }
                else if (Enum.TryParse<PaymentOption>(paymentType, true, out var paymentOption))
                {
                    // Single payment type
                    qry = qry.Where(d => d.Payments.Count == 1 && d.Payments.Any(p => p.PaymentOption == paymentOption));
                }
            }

            // Project to DTO with calculated fields
            var projected = qry.Select(d => new GetSalesDocumentListItemDto
            {
                Id = d.Id,
                DocumentType = d.DocumentType,
                IssueDate = d.IssueDate,
                DocumentNumber = d.DocumentNumber,
                ClientId = d.ClientId,
                TotalNet = d.TotalNet,
                TotalTax = d.TotalTax,
                TotalGross = d.TotalGross,
                NumberOfProducts = d.Items.Sum(i => i.Quantity),
                PaymentType = d.Payments.Select(p => p.PaymentOption).Distinct().Count() > 1
                    ? "Mix"
                    : d.Payments.Any()
                        ? d.Payments.First().PaymentOption.ToString()
                        : "Unspecified"
            });

            // Apply sorting
            projected = ApplySorting(projected, orderBy, sortDirection);

            return await projected.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        private IQueryable<GetSalesDocumentListItemDto> ApplySorting(
            IQueryable<GetSalesDocumentListItemDto> query,
            string? orderBy,
            string? sortDirection)
        {
            var isDescending = sortDirection?.Equals("desc", StringComparison.OrdinalIgnoreCase) ?? false;

            return (orderBy?.ToLower()) switch
            {
                "documentnumber" => isDescending
                    ? query.OrderByDescending(d => d.DocumentNumber)
                    : query.OrderBy(d => d.DocumentNumber),
                "date" or "issuedate" => isDescending
                    ? query.OrderByDescending(d => d.IssueDate)
                    : query.OrderBy(d => d.IssueDate),
                "grossamount" or "totalGross" => isDescending
                    ? query.OrderByDescending(d => d.TotalGross)
                    : query.OrderBy(d => d.TotalGross),
                _ => query.OrderByDescending(d => d.IssueDate) // Default: newest first
            };
        }

        // --- UPDATE HEADER ---
        public async Task UpdateHeaderAsync(int id, UpdateSalesDocumentDto dto, CancellationToken ct = default)
        {
            // find document
            var doc = await _db.SalesDocuments
                .Include(d => d.Payments)
                .FirstOrDefaultAsync(d => d.Id == id, ct)
                ?? throw new KeyNotFoundException($"SalesDocument {id} not found.");

            // basic validations
            if ((dto.DocumentType == SalesDocumentType.InvoicePersonal || dto.DocumentType == SalesDocumentType.InvoiceCompany)
                && dto.ClientId is null)
                throw new ArgumentException("ClientId is required for invoices.", nameof(dto.ClientId));

            var exists = await _db.SalesDocuments
                .AnyAsync(x => x.Id != id &&
                               x.DocumentType == dto.DocumentType &&
                               x.DocumentNumber == dto.DocumentNumber, ct);
            if (exists) throw new InvalidOperationException("DocumentNumber already exists for this DocumentType.");

            // update fields
            doc.DocumentType = dto.DocumentType;
            doc.IssueDate = dto.IssueDate;
            doc.Description = dto.Description;
            doc.DocumentNumber = dto.DocumentNumber.Trim();
            doc.ClientId = dto.ClientId;

            await _db.SaveChangesAsync(ct);

            var paid = doc.Payments.Sum(p => p.Amount);
            if (paid != doc.TotalGross && doc.Payments.Count > 0)
                throw new InvalidOperationException($"Sum of payments ({paid:F2}) must equal document TotalGross ({doc.TotalGross:F2}).");
        }

        // --- FINALIZE POS TRANSACTION ---
        public async Task<POSFinalizationResponseDto> FinalizePOSTransactionAsync(POSFinalizationDto dto, CancellationToken ct = default)
        {
            // Validations
            if (dto.Items is null || dto.Items.Count == 0)
                throw new ArgumentException("Transaction must contain at least one item.", nameof(dto.Items));

            if (dto.Payments is null || dto.Payments.Count == 0)
                throw new ArgumentException("Transaction must contain at least one payment.", nameof(dto.Payments));

            if ((dto.DocumentType == SalesDocumentType.InvoicePersonal || dto.DocumentType == SalesDocumentType.InvoiceCompany)
                && dto.ClientId is null)
                throw new ArgumentException("ClientId is required for invoices.", nameof(dto.ClientId));

            // Validate all items have locations
            var itemsWithoutLocation = dto.Items.Where(i => i.FromLocationId <= 0).ToList();
            if (itemsWithoutLocation.Any())
                throw new ArgumentException("All items must have a valid location selected.", nameof(dto.Items));

            // Start database transaction for atomicity
            using var transaction = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                // 1. Generate document number
                var now = DateTimeOffset.Now;
                var documentNumber = await GenerateDocumentNumberAsync(now.Year, ct);

                // 2. Fetch and validate tax rates
                var taxRateIds = dto.Items.Select(i => i.TaxRateId).Distinct().ToList();
                var taxRates = await _db.TaxRates
                    .Where(t => taxRateIds.Contains(t.Id) && t.IsActive)
                    .ToDictionaryAsync(t => t.Id, ct);

                foreach (var item in dto.Items)
                {
                    if (!taxRates.ContainsKey(item.TaxRateId))
                        throw new ArgumentException($"TaxRateId {item.TaxRateId} not found or inactive.", nameof(dto.Items));
                }

                // 3. Verify products exist
                var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
                var productExists = await _db.Products
                    .Where(p => productIds.Contains(p.Id) && p.IsActive)
                    .Select(p => p.Id)
                    .ToListAsync(ct);
                var missingProducts = productIds.Except(productExists).ToList();
                if (missingProducts.Count > 0)
                    throw new ArgumentException($"Products not found or inactive: {string.Join(",", missingProducts)}", nameof(dto.Items));

                // 4. Verify locations exist and check inventory availability
                foreach (var item in dto.Items)
                {
                    var inventory = await _db.ProductsInWarehouse
                        .FirstOrDefaultAsync(pw => pw.ProductId == item.ProductId && pw.LocationId == item.FromLocationId, ct);

                    if (inventory == null)
                        throw new InvalidOperationException($"Product '{item.ProductName}' not found at selected location.");

                    if (inventory.Quantity < item.Quantity)
                        throw new InvalidOperationException($"Insufficient stock for '{item.ProductName}' at selected location. Available: {inventory.Quantity}, Requested: {item.Quantity}");
                }

                // 5. Create sales document
                var doc = new SalesDocument
                {
                    DocumentType = dto.DocumentType,
                    IssueDate = now,
                    DocumentNumber = documentNumber,
                    ClientId = dto.ClientId,
                    Items = new List<SalesDocumentItem>(),
                    Payments = new List<SalesPayment>()
                };

                // Generate description
                var itemSummary = string.Join(", ", dto.Items.Select(i => $"{i.ProductName} x{i.Quantity}"));
                doc.Description = $"POS Sale - {now:dd/MM/yyyy - HH:mm:ss} - Items: {itemSummary}";

                // 6. Calculate totals and create line items
                decimal totalNet = 0m, totalTax = 0m, totalGross = 0m;

                foreach (var i in dto.Items)
                {
                    var vat = taxRates[i.TaxRateId].Rate;
                    var lineNet = Round2(i.UnitPriceNet * i.Quantity);
                    var lineTax = Round2(lineNet * vat);
                    var lineGross = Round2(lineNet + lineTax);

                    doc.Items.Add(new SalesDocumentItem
                    {
                        ProductId = i.ProductId,
                        ProductName = i.ProductName,
                        ProductSKU = i.ProductSKU,
                        Quantity = i.Quantity,
                        UnitPriceNet = Round4(i.UnitPriceNet),
                        TaxRateId = i.TaxRateId,
                        FromLocationId = i.FromLocationId,
                        LineNet = lineNet,
                        LineTax = lineTax,
                        LineGross = lineGross
                    });

                    totalNet += lineNet;
                    totalTax += lineTax;
                    totalGross += lineGross;
                }

                doc.TotalNet = Round2(totalNet);
                doc.TotalTax = Round2(totalTax);
                doc.TotalGross = Round2(totalGross);

                // 7. Create payment records
                decimal totalPaid = 0m;
                foreach (var p in dto.Payments)
                {
                    doc.Payments.Add(new SalesPayment
                    {
                        PaymentOption = p.PaymentOption,
                        Amount = Round2(p.Amount),
                        AmountTendered = p.AmountTendered.HasValue ? Round2(p.AmountTendered.Value) : null,
                        Change = p.Change.HasValue ? Round2(p.Change.Value) : null
                    });
                    totalPaid += Round2(p.Amount);
                }

                // Validate payments match total (allow overpayment for change)
                if (totalPaid < doc.TotalGross)
                    throw new InvalidOperationException($"Insufficient payment. Total: {doc.TotalGross:F2}, Paid: {totalPaid:F2}");

                var change = totalPaid - doc.TotalGross;

                // 8. Deduct inventory quantities
                foreach (var item in dto.Items)
                {
                    var inventory = await _db.ProductsInWarehouse
                        .FirstOrDefaultAsync(pw => pw.ProductId == item.ProductId && pw.LocationId == item.FromLocationId, ct);

                    if (inventory != null)
                    {
                        inventory.Quantity -= item.Quantity;

                        // If quantity reaches zero, optionally remove the entry (or keep it at 0)
                        if (inventory.Quantity == 0)
                        {
                            _db.ProductsInWarehouse.Remove(inventory);
                        }
                        else
                        {
                            _db.ProductsInWarehouse.Update(inventory);
                        }
                    }
                }

                // 9. Save sales document
                _db.SalesDocuments.Add(doc);
                await _db.SaveChangesAsync(ct);

                // 10. Commit transaction
                await transaction.CommitAsync(ct);

                // 11. Return response
                return new POSFinalizationResponseDto
                {
                    SalesDocumentId = doc.Id,
                    DocumentNumber = doc.DocumentNumber,
                    IssueDate = doc.IssueDate,
                    TotalNet = doc.TotalNet,
                    TotalTax = doc.TotalTax,
                    TotalGross = doc.TotalGross,
                    Change = change
                };
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        }

        // --- GENERATE DOCUMENT NUMBER ---
        private async Task<string> GenerateDocumentNumberAsync(int year, CancellationToken ct = default)
        {
            // Format: S1C1/YYYY/Yno
            // S1C1 = Fixed prefix (Store 1, Cash register 1)
            // YYYY = Current year
            // Yno = Sequential number for this year

            var prefix = $"S1C1/{year}/";

            // Get ALL document numbers for this year to find gaps and the highest number
            var existingNumbers = await _db.SalesDocuments
                .Where(d => d.DocumentNumber.StartsWith(prefix))
                .Select(d => d.DocumentNumber)
                .ToListAsync(ct);

            // Extract all sequential numbers
            var usedNumbers = existingNumbers
                .Select(docNum => {
                    var parts = docNum.Split('/');
                    if (parts.Length == 3 && int.TryParse(parts[2], out int num))
                        return num;
                    return 0;
                })
                .Where(n => n > 0)
                .OrderBy(n => n)
                .ToList();

            // Find the first available number (either a gap or max + 1)
            int nextNumber = 1;
            foreach (var num in usedNumbers)
            {
                if (num == nextNumber)
                    nextNumber++;
                else
                    break; // Found a gap
            }

            return $"{prefix}{nextNumber}";
        }

        private static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
        private static decimal Round4(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);
    }
}
