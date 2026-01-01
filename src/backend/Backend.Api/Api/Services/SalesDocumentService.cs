using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface ISalesDocumentService
    {
        Task<int> CreateAsync(CreateSalesDocumentDto dto, int userId, CancellationToken ct = default);
        Task<POSFinalizationResponseDto> FinalizePOSTransactionAsync(POSFinalizationDto dto, int userId, CancellationToken ct = default);
        Task<POSReturnResponseDto> ProcessReturnAsync(POSReturnDto dto, int userId, CancellationToken ct = default);
        Task<GetSalesDocumentDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<GetSalesDocumentDto?> GetByDocumentNumberAsync(string documentNumber, CancellationToken ct = default);
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
        private readonly IInventoryChangeService _inventoryChangeService;

        public SalesDocumentService(AppDbContext db, IInventoryChangeService inventoryChangeService)
        {
            _db = db;
            _inventoryChangeService = inventoryChangeService;
        }

        // --- CREATE DOCUMENT ---
        public async Task<int> CreateAsync(CreateSalesDocumentDto dto, int userId, CancellationToken ct = default)
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
                UserId = userId,
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
                var lineGross = Round2(i.UnitGross * i.Quantity);
                var lineNet = Round2(lineGross / (1 + vat));
                var lineTax = Round2(lineGross - lineNet);

                doc.Items.Add(new SalesDocumentItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    ProductSKU = i.ProductSKU,
                    Quantity = i.Quantity,
                    UnitGross = Round4(i.UnitGross),
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
                .Include(d => d.Payments).ThenInclude(p => p.GiftCard)
                .Include(d => d.User)
                .Include(d => d.OriginalDocument)
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
                OriginalDocumentId = doc.OriginalDocumentId,
                OriginalDocumentNumber = doc.OriginalDocument?.DocumentNumber,
                UserId = doc.UserId,
                UserName = doc.User.FirstName + " " + doc.User.LastName,
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
                    UnitGross = i.UnitGross,
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
                    Change = p.Change,
                    GiftCardId = p.GiftCardId,
                    GiftCardCode = p.GiftCard != null ? p.GiftCard.Code : null
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
                .Include(d => d.Payments).ThenInclude(p => p.GiftCard)
                .Include(d => d.User)
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
                UserId = d.UserId,
                UserName = d.User.FirstName + " " + d.User.LastName,
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

            // Special handling for DocumentNumber sorting (needs numeric parsing)
            if (orderBy?.Equals("documentnumber", StringComparison.OrdinalIgnoreCase) == true)
            {
                // Fetch all data and sort in memory for correct numeric ordering
                var allData = await projected.ToListAsync(ct);
                var isDescending = sortDirection?.Equals("desc", StringComparison.OrdinalIgnoreCase) ?? false;

                var sorted = isDescending
                    ? allData.OrderByDescending(d => ExtractDocumentNumberParts(d.DocumentNumber).year)
                            .ThenByDescending(d => ExtractDocumentNumberParts(d.DocumentNumber).sequenceNumber)
                    : allData.OrderBy(d => ExtractDocumentNumberParts(d.DocumentNumber).year)
                            .ThenBy(d => ExtractDocumentNumberParts(d.DocumentNumber).sequenceNumber);

                return sorted.ToPagedResult(pagination.PageNumber, pagination.PageSize);
            }

            // Apply sorting for other columns
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
                .Include(d => d.Payments).ThenInclude(p => p.GiftCard)
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
        public async Task<POSFinalizationResponseDto> FinalizePOSTransactionAsync(POSFinalizationDto dto, int userId, CancellationToken ct = default)
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
                var documentNumber = await GenerateDocumentNumberAsync(now.Year, false, ct);

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
                    UserId = userId,
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
                    var lineGross = Round2(i.UnitGross * i.Quantity);
                    var lineNet = Round2(lineGross / (1 + vat));
                    var lineTax = Round2(lineGross - lineNet);

                    doc.Items.Add(new SalesDocumentItem
                    {
                        ProductId = i.ProductId,
                        ProductName = i.ProductName,
                        ProductSKU = i.ProductSKU,
                        Quantity = i.Quantity,
                        UnitGross = Round4(i.UnitGross),
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
                        Change = p.Change.HasValue ? Round2(p.Change.Value) : null,
                        GiftCardId = p.GiftCardId
                    });
                    totalPaid += Round2(p.Amount);
                }

                // Validate payments match total (allow overpayment for change)
                if (totalPaid < doc.TotalGross)
                    throw new InvalidOperationException($"Insufficient payment. Total: {doc.TotalGross:F2}, Paid: {totalPaid:F2}");

                var change = totalPaid - doc.TotalGross;

                // 8. Deduct inventory quantities and log changes
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

                        // Log inventory change for this sale (negative quantity for removal)
                        await _inventoryChangeService.LogInventoryChangeAsync(
                            changeType: Objects.Entities.Enums.InventoryChangeType.Sell,
                            productId: item.ProductId,
                            quantity: -item.Quantity,
                            fromLocationId: item.FromLocationId,
                            toLocationId: null,
                            userId: dto.UserId,
                            ct: ct);
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

        // --- PROCESS RETURN ---
        public async Task<POSReturnResponseDto> ProcessReturnAsync(POSReturnDto dto, int userId, CancellationToken ct = default)
        {
            // Validations
            if (string.IsNullOrWhiteSpace(dto.OriginalDocumentNumber))
                throw new ArgumentException("Original document number is required.", nameof(dto.OriginalDocumentNumber));

            if (dto.Items is null || dto.Items.Count == 0)
                throw new ArgumentException("Return must contain at least one item.", nameof(dto.Items));

            // Start database transaction for atomicity
            using var transaction = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                // 1. Find original document by document number
                var originalDoc = await _db.SalesDocuments
                    .Include(d => d.Items)
                    .Include(d => d.Client)
                    .FirstOrDefaultAsync(d => d.DocumentNumber == dto.OriginalDocumentNumber.Trim(), ct);

                if (originalDoc == null)
                    throw new InvalidOperationException($"Original document '{dto.OriginalDocumentNumber}' not found.");

                // Verify original document is not already a return
                if (originalDoc.DocumentType == SalesDocumentType.ReceiptReturn ||
                    originalDoc.DocumentType == SalesDocumentType.InvoiceReturn)
                    throw new InvalidOperationException("Cannot return a return document.");

                // 2. Validate return items exist in original document
                foreach (var returnItem in dto.Items)
                {
                    var originalItem = originalDoc.Items.FirstOrDefault(i => i.Id == returnItem.OriginalItemId);
                    if (originalItem == null)
                        throw new ArgumentException($"Item with ID {returnItem.OriginalItemId} not found in original document.", nameof(dto.Items));

                    // Validate return quantity doesn't exceed original quantity
                    if (returnItem.ReturnQuantity > originalItem.Quantity)
                        throw new InvalidOperationException($"Cannot return {returnItem.ReturnQuantity} units of '{returnItem.ProductName}'. Original quantity: {originalItem.Quantity}");

                    // Validate location quantities sum matches return quantity
                    var totalLocationQty = returnItem.Locations.Sum(l => l.Quantity);
                    if (totalLocationQty != returnItem.ReturnQuantity)
                        throw new ArgumentException($"Sum of location quantities ({totalLocationQty}) must equal return quantity ({returnItem.ReturnQuantity}) for '{returnItem.ProductName}'.", nameof(dto.Items));
                }

                // 3. Generate return document number
                var now = DateTimeOffset.Now;
                var documentNumber = await GenerateDocumentNumberAsync(now.Year, true, ct);

                // 4. Determine return document type based on original
                var returnDocType = originalDoc.DocumentType switch
                {
                    SalesDocumentType.Receipt => SalesDocumentType.ReceiptReturn,
                    SalesDocumentType.InvoicePersonal => SalesDocumentType.InvoiceReturn,
                    SalesDocumentType.InvoiceCompany => SalesDocumentType.InvoiceReturn,
                    _ => throw new InvalidOperationException($"Cannot create return for document type: {originalDoc.DocumentType}")
                };

                // 5. Fetch tax rates
                var taxRateIds = dto.Items.Select(i => i.TaxRateId).Distinct().ToList();
                var taxRates = await _db.TaxRates
                    .Where(t => taxRateIds.Contains(t.Id) && t.IsActive)
                    .ToDictionaryAsync(t => t.Id, ct);

                foreach (var item in dto.Items)
                {
                    if (!taxRates.ContainsKey(item.TaxRateId))
                        throw new ArgumentException($"TaxRateId {item.TaxRateId} not found or inactive.", nameof(dto.Items));
                }

                // 6. Create return document
                var returnDoc = new SalesDocument
                {
                    DocumentType = returnDocType,
                    IssueDate = now,
                    DocumentNumber = documentNumber,
                    ClientId = originalDoc.ClientId,
                    OriginalDocumentId = originalDoc.Id,
                    UserId = userId,
                    Description = $"Return of ##{originalDoc.DocumentNumber}##",
                    Items = new List<SalesDocumentItem>(),
                    Payments = new List<SalesPayment>()
                };

                // 7. Calculate totals and create line items with NEGATIVE quantities
                decimal totalNet = 0m, totalTax = 0m, totalGross = 0m;

                foreach (var returnItem in dto.Items)
                {
                    var vat = taxRates[returnItem.TaxRateId].Rate;

                    // Create separate line items for each location
                    foreach (var location in returnItem.Locations)
                    {
                        var locationNegativeQty = -location.Quantity;
                        var locationLineGross = Round2(returnItem.UnitGross * locationNegativeQty);
                        var locationLineNet = Round2(locationLineGross / (1 + vat));
                        var locationLineTax = Round2(locationLineGross - locationLineNet);

                        returnDoc.Items.Add(new SalesDocumentItem
                        {
                            ProductId = returnItem.ProductId,
                            ProductName = returnItem.ProductName,
                            ProductSKU = returnItem.ProductSKU,
                            Quantity = locationNegativeQty, // NEGATIVE
                            UnitGross = Round4(returnItem.UnitGross),
                            TaxRateId = returnItem.TaxRateId,
                            FromLocationId = location.ToLocationId, // Where product is being returned TO
                            LineNet = locationLineNet,
                            LineTax = locationLineTax,
                            LineGross = locationLineGross
                        });

                        totalNet += locationLineNet;
                        totalTax += locationLineTax;
                        totalGross += locationLineGross;
                    }
                }

                returnDoc.TotalNet = Round2(totalNet);
                returnDoc.TotalTax = Round2(totalTax);
                returnDoc.TotalGross = Round2(totalGross); // Will be negative

                // 8. Create refund payment record with NEGATIVE amount
                var refundAmount = Math.Abs(returnDoc.TotalGross);
                returnDoc.Payments.Add(new SalesPayment
                {
                    PaymentOption = dto.RefundMethod,
                    Amount = returnDoc.TotalGross, // NEGATIVE (refund)
                    AmountTendered = null,
                    Change = null
                });

                // 9. Add returned products back to inventory at specified locations
                foreach (var returnItem in dto.Items)
                {
                    foreach (var location in returnItem.Locations)
                    {
                        var inventory = await _db.ProductsInWarehouse
                            .FirstOrDefaultAsync(pw => pw.ProductId == returnItem.ProductId && pw.LocationId == location.ToLocationId, ct);

                        if (inventory != null)
                        {
                            // Location exists - add to existing quantity
                            inventory.Quantity += location.Quantity;
                            _db.ProductsInWarehouse.Update(inventory);
                        }
                        else
                        {
                            // Location doesn't exist - create new entry
                            _db.ProductsInWarehouse.Add(new ProductsInWarehouse
                            {
                                ProductId = returnItem.ProductId,
                                LocationId = location.ToLocationId,
                                Quantity = location.Quantity
                            });
                        }

                        // Log inventory change for this return (positive quantity for addition)
                        await _inventoryChangeService.LogInventoryChangeAsync(
                            changeType: Objects.Entities.Enums.InventoryChangeType.Return,
                            productId: returnItem.ProductId,
                            quantity: location.Quantity, // POSITIVE for return
                            fromLocationId: null,
                            toLocationId: location.ToLocationId,
                            userId: dto.UserId,
                            ct: ct);
                    }
                }

                // 10. Update original document quantities (reduce by returned amount)
                foreach (var returnItem in dto.Items)
                {
                    var originalItem = originalDoc.Items.FirstOrDefault(i => i.Id == returnItem.OriginalItemId);
                    if (originalItem != null)
                    {
                        // Reduce quantity by returned amount
                        originalItem.Quantity -= returnItem.ReturnQuantity;

                        // Recalculate line totals based on new quantity
                        var vat = taxRates[returnItem.TaxRateId].Rate;
                        var lineGross = Round2(originalItem.UnitGross * originalItem.Quantity);
                        var lineNet = Round2(lineGross / (1 + vat));
                        var lineTax = Round2(lineGross - lineNet);

                        originalItem.LineNet = lineNet;
                        originalItem.LineTax = lineTax;
                        originalItem.LineGross = lineGross;
                    }
                }

                // Recalculate original document totals
                originalDoc.TotalNet = Round2(originalDoc.Items.Sum(i => i.LineNet));
                originalDoc.TotalTax = Round2(originalDoc.Items.Sum(i => i.LineTax));
                originalDoc.TotalGross = Round2(originalDoc.Items.Sum(i => i.LineGross));

                // Note: Payments will no longer match totals after partial returns
                // This is expected - the original payment was for the full amount
                _db.SalesDocuments.Update(originalDoc);

                // 11. Save return document
                _db.SalesDocuments.Add(returnDoc);
                await _db.SaveChangesAsync(ct);

                // 12. Commit transaction
                await transaction.CommitAsync(ct);

                // 13. Return response
                return new POSReturnResponseDto
                {
                    ReturnDocumentId = returnDoc.Id,
                    ReturnDocumentNumber = returnDoc.DocumentNumber,
                    IssueDate = returnDoc.IssueDate,
                    TotalNet = returnDoc.TotalNet,
                    TotalTax = returnDoc.TotalTax,
                    TotalGross = returnDoc.TotalGross,
                    RefundAmount = refundAmount
                };
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        }

        // --- GET DOCUMENT BY DOCUMENT NUMBER ---
        public async Task<GetSalesDocumentDto?> GetByDocumentNumberAsync(string documentNumber, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(documentNumber))
                return null;

            var doc = await _db.SalesDocuments
                .AsNoTracking()
                .Include(d => d.Items).ThenInclude(i => i.TaxRate)
                .Include(d => d.Items).ThenInclude(i => i.FromLocation)
                .Include(d => d.Payments).ThenInclude(p => p.GiftCard)
                .Include(d => d.User)
                .Include(d => d.OriginalDocument)
                .FirstOrDefaultAsync(d => d.DocumentNumber == documentNumber.Trim(), ct);

            if (doc is null) return null;

            return new GetSalesDocumentDto
            {
                Id = doc.Id,
                DocumentType = doc.DocumentType,
                IssueDate = doc.IssueDate,
                Description = doc.Description,
                DocumentNumber = doc.DocumentNumber,
                ClientId = doc.ClientId,
                OriginalDocumentId = doc.OriginalDocumentId,
                OriginalDocumentNumber = doc.OriginalDocument?.DocumentNumber,
                UserId = doc.UserId,
                UserName = doc.User.FirstName + " " + doc.User.LastName,
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
                    UnitGross = i.UnitGross,
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
                    Change = p.Change,
                    GiftCardId = p.GiftCardId,
                    GiftCardCode = p.GiftCard != null ? p.GiftCard.Code : null
                }).ToList()
            };
        }

        // --- GENERATE DOCUMENT NUMBER ---
        private async Task<string> GenerateDocumentNumberAsync(int year, bool isReturn = false, CancellationToken ct = default)
        {
            // Format: S1C1/YYYY/XXXX for sales
            // Format: S1C1/YYYY/RR/XXXX for returns (separate sequence)
            // S1C1 = Fixed prefix (Store 1, Cash register 1)
            // YYYY = Current year
            // RR = Return indicator (only for returns)
            // XXXX = Sequential number for this year (separate for sales and returns)

            var prefix = isReturn ? $"S1C1/{year}/RR/" : $"S1C1/{year}/";

            // Get ALL document numbers for this year and type to find gaps and the highest number
            var existingNumbers = await _db.SalesDocuments
                .Where(d => d.DocumentNumber.StartsWith(prefix))
                .Select(d => d.DocumentNumber)
                .ToListAsync(ct);

            // Extract all sequential numbers
            var usedNumbers = existingNumbers
                .Select(docNum => {
                    var parts = docNum.Split('/');
                    int expectedLength = isReturn ? 4 : 3;
                    int numberIndex = isReturn ? 3 : 2;

                    if (parts.Length == expectedLength && int.TryParse(parts[numberIndex], out int num))
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

            // Use 4-digit zero-padding for proper string sorting (e.g., 0001, 0002, ...)
            return $"{prefix}{nextNumber:D4}";
        }

        // --- HELPER: Extract year and sequence number from document number ---
        private static (int year, int sequenceNumber) ExtractDocumentNumberParts(string documentNumber)
        {
            // Format: S1C1/YYYY/XXXX (sales)
            // Format: S1C1/YYYY/RR/XXXX (returns)
            try
            {
                var parts = documentNumber.Split('/');
                if (parts.Length == 3)
                {
                    // Sales document: S1C1/YYYY/XXXX
                    var year = int.TryParse(parts[1], out var y) ? y : 0;
                    var seqNum = int.TryParse(parts[2], out var s) ? s : 0;
                    return (year, seqNum);
                }
                else if (parts.Length == 4 && parts[2] == "RR")
                {
                    // Return document: S1C1/YYYY/RR/XXXX
                    var year = int.TryParse(parts[1], out var y) ? y : 0;
                    var seqNum = int.TryParse(parts[3], out var s) ? s : 0;
                    return (year, seqNum);
                }
            }
            catch
            {
                // Ignore parse errors
            }
            return (0, 0);
        }

        private static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
        private static decimal Round4(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);
    }

    // --- EXTENSION: In-memory pagination for sorted lists ---
    public static class EnumerableExtensions
    {
        public static PagedResult<T> ToPagedResult<T>(this IEnumerable<T> source, int pageNumber, int pageSize)
        {
            var sourceList = source.ToList(); // Materialize once to avoid multiple enumerations
            var items = sourceList.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
            var totalCount = sourceList.Count;

            return new PagedResult<T>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
                // TotalPages is computed automatically from TotalCount / PageSize
            };
        }
    }
}
