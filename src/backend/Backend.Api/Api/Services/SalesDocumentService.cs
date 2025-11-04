using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface ISalesDocumentService
    {
        Task<int> CreateAsync(CreateSalesDocumentDto dto, CancellationToken ct = default);
        Task<GetSalesDocumentDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PagedResult<GetSalesDocumentListItemDto>> GetAllAsync(
            SalesDocumentType? type = null,
            int? clientId = null,
            DateTimeOffset? from = null,
            DateTimeOffset? to = null,
            string? q = null,
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
                    Amount = Round2(p.Amount)
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
                    LineGross = i.LineGross
                }).ToList(),
                Payments = doc.Payments.Select(p => new GetSalesPaymentDto
                {
                    Id = p.Id,
                    SalesDocumentId = p.SalesDocumentId,
                    PaymentOption = p.PaymentOption,
                    Amount = p.Amount
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
            PaginationParams? pagination = null,
            CancellationToken ct = default)
        {
            pagination ??= new PaginationParams();

            var qry = _db.SalesDocuments.AsNoTracking().AsQueryable();

            if (type.HasValue)
                qry = qry.Where(d => d.DocumentType == type.Value);

            if (clientId.HasValue)
                qry = qry.Where(d => d.ClientId == clientId.Value);

            if (from.HasValue)
                qry = qry.Where(d => d.IssueDate >= from.Value);

            if (to.HasValue)
                qry = qry.Where(d => d.IssueDate <= to.Value);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                qry = qry.Where(d =>
                    d.DocumentNumber.ToLower().Contains(term) ||
                    (d.Description != null && d.Description.ToLower().Contains(term)));
            }

            var projected = qry
                .OrderByDescending(d => d.IssueDate)
                .Select(d => new GetSalesDocumentListItemDto
                {
                    Id = d.Id,
                    DocumentType = d.DocumentType,
                    IssueDate = d.IssueDate,
                    DocumentNumber = d.DocumentNumber,
                    ClientId = d.ClientId,
                    TotalGross = d.TotalGross
                });

            return await projected.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
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

        private static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
        private static decimal Round4(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);
    }
}
