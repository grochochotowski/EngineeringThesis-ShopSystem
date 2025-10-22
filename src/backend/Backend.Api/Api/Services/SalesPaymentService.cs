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
    public interface ISalesPaymentService
    {
        Task<GetSalesPaymentDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<IEnumerable<GetSalesPaymentDto>> GetByDocumentAsync(int salesDocumentId, CancellationToken ct = default);

        Task<int> CreateAsync(int salesDocumentId, CreateSalesPaymentDto dto, CancellationToken ct = default);
        Task UpdateAsync(int id, UpdateSalesPaymentDto dto, CancellationToken ct = default);
    }

    public class SalesPaymentService : ISalesPaymentService
    {
        private readonly AppDbContext _db;
        public SalesPaymentService(AppDbContext db) => _db = db;

        public async Task<GetSalesPaymentDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.SalesPayments
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            return e is null ? null : new GetSalesPaymentDto
            {
                Id = e.Id,
                SalesDocumentId = e.SalesDocumentId,
                PaymentOption = e.PaymentOption,
                Amount = e.Amount
            };
        }

        public async Task<IEnumerable<GetSalesPaymentDto>> GetByDocumentAsync(int salesDocumentId, CancellationToken ct = default)
        {
            var list = await _db.SalesPayments
                .AsNoTracking()
                .Where(x => x.SalesDocumentId == salesDocumentId)
                .OrderBy(x => x.Id)
                .ToListAsync(ct);

            return list.Select(x => new GetSalesPaymentDto
            {
                Id = x.Id,
                SalesDocumentId = x.SalesDocumentId,
                PaymentOption = x.PaymentOption,
                Amount = x.Amount
            });
        }

        public async Task<int> CreateAsync(int salesDocumentId, CreateSalesPaymentDto dto, CancellationToken ct = default)
        {
            var doc = await _db.SalesDocuments
                .FirstOrDefaultAsync(d => d.Id == salesDocumentId, ct)
                ?? throw new KeyNotFoundException($"SalesDocument {salesDocumentId} not found.");

            if (dto.Amount < 0m)
                throw new ArgumentException("Amount cannot be negative.", nameof(dto.Amount));

            var payment = new SalesPayment
            {
                SalesDocumentId = salesDocumentId,
                PaymentOption = dto.PaymentOption,
                Amount = Round2(dto.Amount)
            };

            _db.SalesPayments.Add(payment);

            await _db.SaveChangesAsync(ct);
            await EnsurePaymentsMatchTotalAsync(doc.Id, ct);

            return payment.Id;
        }

        public async Task UpdateAsync(int id, UpdateSalesPaymentDto dto, CancellationToken ct = default)
        {
            var payment = await _db.SalesPayments
                .Include(p => p.SalesDocument)
                .FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw new KeyNotFoundException($"SalesPayment {id} not found.");

            if (dto.Amount < 0m)
                throw new ArgumentException("Amount cannot be negative.", nameof(dto.Amount));

            payment.PaymentOption = dto.PaymentOption;
            payment.Amount = Round2(dto.Amount);

            await _db.SaveChangesAsync(ct);
            await EnsurePaymentsMatchTotalAsync(payment.SalesDocumentId, ct);
        }

        private static decimal Round2(decimal v) =>
            Math.Round(v, 2, MidpointRounding.AwayFromZero);
        private async Task EnsurePaymentsMatchTotalAsync(int salesDocumentId, CancellationToken ct)
        {
            var snapshot = await _db.SalesDocuments
                .AsNoTracking()
                .Where(d => d.Id == salesDocumentId)
                .Select(d => new
                {
                    d.Id,
                    d.TotalGross,
                    Paid = _db.SalesPayments
                        .Where(p => p.SalesDocumentId == d.Id)
                        .Sum(p => (decimal?)p.Amount) ?? 0m
                })
                .FirstAsync(ct);

            if (snapshot.Paid != snapshot.TotalGross)
            {
                throw new InvalidOperationException(
                    $"Sum of payments ({snapshot.Paid:F2}) must equal document TotalGross ({snapshot.TotalGross:F2}).");
            }
        }
    }
}