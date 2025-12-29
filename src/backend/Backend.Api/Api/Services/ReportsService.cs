using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public class ReportsService : IReportsService
    {
        private readonly AppDbContext _db;

        public ReportsService(AppDbContext db) => _db = db;

        public async Task<SalesReportDto> GetSalesReportAsync(
            DateTime? dateFrom,
            DateTime? dateTo,
            int userId,
            CancellationToken ct = default)
        {
            // Validate date range
            if (dateFrom.HasValue && dateTo.HasValue && dateFrom.Value > dateTo.Value)
            {
                throw new InvalidOperationException("DateFrom must be before or equal to DateTo.");
            }

            // Get user information
            var user = await _db.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new { u.FirstName, u.LastName })
                .FirstOrDefaultAsync(ct);

            var generatedBy = user != null
                ? $"{user.FirstName} {user.LastName}"
                : "Unknown User";

            // Query all sales documents in the date range
            IQueryable<SalesDocument> query = _db.SalesDocuments
                .AsNoTracking()
                .Include(d => d.Items)
                    .ThenInclude(i => i.TaxRate);

            // Apply date filters conditionally
            if (dateFrom.HasValue)
            {
                query = query.Where(d => d.IssueDate >= dateFrom.Value);
            }
            if (dateTo.HasValue)
            {
                query = query.Where(d => d.IssueDate <= dateTo.Value);
            }

            var documents = await query.ToListAsync(ct);

            // Initialize stats objects
            var receiptsStats = new DocumentTypeStats();
            var invoicesPersonalStats = new DocumentTypeStats();
            var invoicesCompanyStats = new DocumentTypeStats();

            // Dictionary to track tax breakdown
            var taxBreakdownDict = new Dictionary<int, TaxBreakdownDto>();

            // Process each document
            foreach (var doc in documents)
            {
                var stats = doc.DocumentType switch
                {
                    SalesDocumentType.Receipt => receiptsStats,
                    SalesDocumentType.InvoicePersonal => invoicesPersonalStats,
                    SalesDocumentType.InvoiceCompany => invoicesCompanyStats,
                    _ => null
                };

                if (stats != null)
                {
                    stats.Count++;
                    stats.TotalGross += doc.TotalGross;
                    stats.TotalTax += doc.TotalTax;
                    stats.TotalNet += doc.TotalNet;
                }

                // Process items for tax breakdown
                foreach (var item in doc.Items)
                {
                    if (!taxBreakdownDict.ContainsKey(item.TaxRateId))
                    {
                        taxBreakdownDict[item.TaxRateId] = new TaxBreakdownDto
                        {
                            TaxCode = item.TaxRate.Code,
                            TaxRate = item.TaxRate.Rate * 100m, // Convert to percentage
                            TotalProducts = 0,
                            DistinctProducts = 0,
                            TaxReceipts = 0,
                            TaxInvoicesPersonal = 0,
                            TaxInvoicesCompany = 0,
                            TaxTotal = 0
                        };
                    }

                    var taxBreakdown = taxBreakdownDict[item.TaxRateId];
                    taxBreakdown.TotalProducts += item.Quantity;

                    // Accumulate tax based on document type
                    switch (doc.DocumentType)
                    {
                        case SalesDocumentType.Receipt:
                            taxBreakdown.TaxReceipts += item.LineTax;
                            break;
                        case SalesDocumentType.InvoicePersonal:
                            taxBreakdown.TaxInvoicesPersonal += item.LineTax;
                            break;
                        case SalesDocumentType.InvoiceCompany:
                            taxBreakdown.TaxInvoicesCompany += item.LineTax;
                            break;
                    }

                    taxBreakdown.TaxTotal += item.LineTax;
                }
            }

            // Calculate distinct products per tax rate
            var itemQuery = _db.SalesDocumentItems
                .AsNoTracking();

            // Apply date filters conditionally
            if (dateFrom.HasValue)
            {
                itemQuery = itemQuery.Where(i => i.SalesDocument.IssueDate >= dateFrom.Value);
            }
            if (dateTo.HasValue)
            {
                itemQuery = itemQuery.Where(i => i.SalesDocument.IssueDate <= dateTo.Value);
            }

            var taxRateProductCounts = await itemQuery
                .GroupBy(i => i.TaxRateId)
                .Select(g => new
                {
                    TaxRateId = g.Key,
                    DistinctProducts = g.Select(i => i.ProductId).Distinct().Count()
                })
                .ToListAsync(ct);

            foreach (var count in taxRateProductCounts)
            {
                if (taxBreakdownDict.ContainsKey(count.TaxRateId))
                {
                    taxBreakdownDict[count.TaxRateId].DistinctProducts = count.DistinctProducts;
                }
            }

            // Calculate total stats
            var totalStats = new DocumentTypeStats
            {
                Count = receiptsStats.Count + invoicesPersonalStats.Count + invoicesCompanyStats.Count,
                TotalGross = receiptsStats.TotalGross + invoicesPersonalStats.TotalGross + invoicesCompanyStats.TotalGross,
                TotalTax = receiptsStats.TotalTax + invoicesPersonalStats.TotalTax + invoicesCompanyStats.TotalTax,
                TotalNet = receiptsStats.TotalNet + invoicesPersonalStats.TotalNet + invoicesCompanyStats.TotalNet
            };

            // Determine actual date range for display
            var actualDateFrom = dateFrom ?? (documents.Any() ? documents.Min(d => d.IssueDate).DateTime : DateTime.MinValue);
            var actualDateTo = dateTo ?? (documents.Any() ? documents.Max(d => d.IssueDate).DateTime : DateTime.MaxValue);

            return new SalesReportDto
            {
                DateFrom = actualDateFrom,
                DateTo = actualDateTo,
                Receipts = receiptsStats,
                InvoicesPersonal = invoicesPersonalStats,
                InvoicesCompany = invoicesCompanyStats,
                Total = totalStats,
                TaxBreakdown = taxBreakdownDict.Values.OrderBy(t => t.TaxCode).ToList(),
                GeneratedBy = generatedBy,
                GeneratedAt = DateTime.UtcNow
            };
        }
    }
}
