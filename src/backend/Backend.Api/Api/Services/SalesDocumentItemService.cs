using Backend.Api.Api.Controllers;
using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

namespace Backend.Api.Api.Services
{
    public interface ISalesDocumentItemService
    {
        Task<GetSalesDocumentItemDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<IEnumerable<GetSalesDocumentItemDto>> GetByDocumentAsync(int salesDocumentId, CancellationToken ct = default);

        Task<int> CreateAsync(int salesDocumentId, CreateSalesDocumentItemDto dto, CancellationToken ct = default);
        Task UpdateAsync(int id, UpdateSalesDocumentItemDto dto, CancellationToken ct = default);
    }

    public class SalesDocumentItemService : ISalesDocumentItemService
    {
        private readonly AppDbContext _db;
        public SalesDocumentItemService(AppDbContext db) => _db = db;

        public async Task<GetSalesDocumentItemDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.SalesDocumentItems
                .AsNoTracking()
                .Include(x => x.TaxRate)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            return e is null ? null : Map(e);
        }

        public async Task<IEnumerable<GetSalesDocumentItemDto>> GetByDocumentAsync(int salesDocumentId, CancellationToken ct = default)
        {
            var items = await _db.SalesDocumentItems
                .AsNoTracking()
                .Include(x => x.TaxRate)
                .Where(x => x.SalesDocumentId == salesDocumentId)
                .OrderBy(x => x.Id)
                .ToListAsync(ct);

            return items.Select(Map);
        }

        public async Task<int> CreateAsync(int salesDocumentId, CreateSalesDocumentItemDto dto, CancellationToken ct = default)
        {
            var doc = await _db.SalesDocuments.FirstOrDefaultAsync(d => d.Id == salesDocumentId, ct)
                      ?? throw new KeyNotFoundException($"SalesDocument {salesDocumentId} not found.");

            if (dto.Quantity <= 0) throw new ArgumentException("Quantity must be > 0.", nameof(dto.Quantity));
            if (dto.UnitPriceNet < 0) throw new ArgumentException("UnitPriceNet must be >= 0.", nameof(dto.UnitPriceNet));

            var tax = await _db.TaxRates.AsNoTracking()
                        .FirstOrDefaultAsync(t => t.Id == dto.TaxRateId && t.IsActive, ct)
                      ?? throw new ArgumentException($"TaxRateId {dto.TaxRateId} not found or inactive.", nameof(dto.TaxRateId));

            var prodExists = await _db.Products.AnyAsync(p => p.Id == dto.ProductId, ct);
            if (!prodExists) throw new ArgumentException($"Product {dto.ProductId} not found.", nameof(dto.ProductId));

            var lineNet = Round2(dto.UnitPriceNet * dto.Quantity);
            var lineTax = Round2(lineNet * tax.Rate);
            var lineGross = Round2(lineNet + lineTax);

            var entity = new SalesDocumentItem
            {
                SalesDocumentId = salesDocumentId,
                ProductId = dto.ProductId,
                ProductName = dto.ProductName,
                ProductSKU = dto.ProductSKU,
                Quantity = dto.Quantity,
                UnitPriceNet = Round4(dto.UnitPriceNet),
                TaxRateId = dto.TaxRateId,
                LineNet = lineNet,
                LineTax = lineTax,
                LineGross = lineGross
            };

            _db.SalesDocumentItems.Add(entity);

            // 3) Aktualizacja sum nagłówka
            await RecalculateHeaderAsync(doc, ct);

            await _db.SaveChangesAsync(ct);
            return entity.Id;
        }

        public async Task UpdateAsync(int id, UpdateSalesDocumentItemDto dto, CancellationToken ct = default)
        {
            var entity = await _db.SalesDocumentItems
                .Include(x => x.SalesDocument)
                .FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new KeyNotFoundException($"SalesDocumentItem {id} not found.");

            if (dto.Quantity <= 0) throw new ArgumentException("Quantity must be > 0.", nameof(dto.Quantity));
            if (dto.UnitPriceNet < 0) throw new ArgumentException("UnitPriceNet must be >= 0.", nameof(dto.UnitPriceNet));

            var tax = await _db.TaxRates.AsNoTracking()
                        .FirstOrDefaultAsync(t => t.Id == dto.TaxRateId && t.IsActive, ct)
                      ?? throw new ArgumentException($"TaxRateId {dto.TaxRateId} not found or inactive.", nameof(dto.TaxRateId));

            var prodExists = await _db.Products.AnyAsync(p => p.Id == dto.ProductId, ct);
            if (!prodExists) throw new ArgumentException($"Product {dto.ProductId} not found.", nameof(dto.ProductId));

            entity.ProductId = dto.ProductId;
            entity.ProductName = dto.ProductName;
            entity.ProductSKU = dto.ProductSKU;
            entity.Quantity = dto.Quantity;
            entity.UnitPriceNet = Round4(dto.UnitPriceNet);
            entity.TaxRateId = dto.TaxRateId;

            var lineNet = Round2(dto.UnitPriceNet * dto.Quantity);
            var lineTax = Round2(lineNet * tax.Rate);
            var lineGross = Round2(lineNet + lineTax);
            entity.LineNet = lineNet;
            entity.LineTax = lineTax;
            entity.LineGross = lineGross;

            await RecalculateHeaderAsync(entity.SalesDocument!, ct);

            await _db.SaveChangesAsync(ct);
        }

        private static GetSalesDocumentItemDto Map(SalesDocumentItem e) => new()
        {
            Id = e.Id,
            SalesDocumentId = e.SalesDocumentId,
            ProductId = e.ProductId,
            ProductName = e.ProductName,
            ProductSKU = e.ProductSKU,
            Quantity = e.Quantity,
            UnitPriceNet = e.UnitPriceNet,
            TaxRateId = e.TaxRateId,
            TaxCode = e.TaxRate.Code,
            LineNet = e.LineNet,
            LineTax = e.LineTax,
            LineGross = e.LineGross
        };

        private async Task RecalculateHeaderAsync(SalesDocument doc, CancellationToken ct)
        {
            await _db.Entry(doc).Collection(d => d.Items).LoadAsync(ct);

            var totalNet = doc.Items.Sum(i => i.LineNet);
            var totalTax = doc.Items.Sum(i => i.LineTax);
            var totalGross = doc.Items.Sum(i => i.LineGross);

            doc.TotalNet = Round2(totalNet);
            doc.TotalTax = Round2(totalTax);
            doc.TotalGross = Round2(totalGross);
        }

        private static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
        private static decimal Round4(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);
    }
}