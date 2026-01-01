using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface ISalesPaymentService
    {
        Task<IEnumerable<GetSalesPaymentDto>> GetByDocumentAsync(int salesDocumentId, CancellationToken ct = default);
        Task<int> CreateAsync(int salesDocumentId, CreateSalesPaymentDto dto, CancellationToken ct = default);
    }

    public class SalesPaymentService : ISalesPaymentService
    {
        private readonly AppDbContext _db;
        public SalesPaymentService(AppDbContext db) => _db = db;

        // --- GET ALL PAYMENTS FOR A DOCUMENT ---
        public async Task<IEnumerable<GetSalesPaymentDto>> GetByDocumentAsync(int salesDocumentId, CancellationToken ct = default)
        {
            var list = await _db.SalesPayments
                .AsNoTracking()
                .Include(x => x.GiftCard)
                .Where(x => x.SalesDocumentId == salesDocumentId)
                .OrderBy(x => x.Id)
                .ToListAsync(ct);

            return list.Select(x => new GetSalesPaymentDto
            {
                Id = x.Id,
                SalesDocumentId = x.SalesDocumentId,
                PaymentOption = x.PaymentOption,
                Amount = x.Amount,
                AmountTendered = x.AmountTendered,
                Change = x.Change,
                GiftCardId = x.GiftCardId,
                GiftCardCode = x.GiftCard != null ? x.GiftCard.Code : null
            });
        }

        // --- CREATE PAYMENT ---
        public async Task<int> CreateAsync(int salesDocumentId, CreateSalesPaymentDto dto, CancellationToken ct = default)
        {
            var exists = await _db.SalesDocuments.AnyAsync(d => d.Id == salesDocumentId, ct);
            if (!exists) throw new KeyNotFoundException($"SalesDocument {salesDocumentId} not found.");

            if (dto.Amount < 0m)
                throw new ArgumentException("Amount cannot be negative.", nameof(dto.Amount));

            var payment = new SalesPayment
            {
                SalesDocumentId = salesDocumentId,
                PaymentOption = dto.PaymentOption,
                Amount = Math.Round(dto.Amount, 2, MidpointRounding.AwayFromZero),
                AmountTendered = dto.AmountTendered.HasValue ? Math.Round(dto.AmountTendered.Value, 2, MidpointRounding.AwayFromZero) : null,
                Change = dto.Change.HasValue ? Math.Round(dto.Change.Value, 2, MidpointRounding.AwayFromZero) : null,
                GiftCardId = dto.GiftCardId
            };

            _db.SalesPayments.Add(payment);
            await _db.SaveChangesAsync(ct);

            return payment.Id;
        }
    }
}
