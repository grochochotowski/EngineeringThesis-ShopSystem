using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface ITaxRateService
    {
        Task<IEnumerable<GetTaxRateDto>> GetAllAsync(bool? onlyActive = null, CancellationToken ct = default);
        Task<GetTaxRateDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<int> CreateAsync(CreateTaxRateDto dto, CancellationToken ct = default);
        Task UpdateAsync(int id, UpdateTaxRateDto dto, CancellationToken ct = default);

        Task<bool> DeactivateAsync(int id, CancellationToken ct = default);
        Task<bool> ActivateAsync(int id, CancellationToken ct = default);
    }

    public class TaxRateService : ITaxRateService
    {
        private readonly AppDbContext _db;
        public TaxRateService(AppDbContext db) => _db = db;

        // --- GET ALL TAX RATES ---
        public async Task<IEnumerable<GetTaxRateDto>> GetAllAsync(bool? onlyActive = null, CancellationToken ct = default)
        {
            var q = _db.TaxRates.AsNoTracking();
            if (onlyActive is true) q = q.Where(x => x.IsActive);

            var list = await q
                .OrderByDescending(x => x.IsActive)
                .ThenBy(x => x.Rate)
                .ThenBy(x => x.Code)
                .ToListAsync(ct);

            return list.Select(x => new GetTaxRateDto
            {
                Id = x.Id,
                Code = x.Code,
                Rate = x.Rate,
                IsActive = x.IsActive
            });
        }

        // --- GET TAX RATE BY ID ---
        public async Task<GetTaxRateDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.TaxRates.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            return e is null ? null : new GetTaxRateDto
            {
                Id = e.Id,
                Code = e.Code,
                Rate = e.Rate,
                IsActive = e.IsActive
            };
        }

        // --- CREATE TAX RATE ---
        public async Task<int> CreateAsync(CreateTaxRateDto dto, CancellationToken ct = default)
        {
            if (dto is null) throw new ArgumentNullException(nameof(dto));

            var code = NormalizeCode(dto.Code);

            var exists = await _db.TaxRates.AnyAsync(x => x.Code == code, ct);
            if (exists) throw new InvalidOperationException($"Tax rate code '{code}' already exists.");

            var rate = Clamp01(dto.Rate);
            rate = Math.Round(rate, 4, MidpointRounding.AwayFromZero);

            var entity = new TaxRate
            {
                Code = code,
                Rate = rate,
                IsActive = dto.IsActive
            };

            _db.TaxRates.Add(entity);
            await _db.SaveChangesAsync(ct);
            return entity.Id;
        }

        // --- UPDATE TAX RATE ---
        public async Task UpdateAsync(int id, UpdateTaxRateDto dto, CancellationToken ct = default)
        {
            var e = await _db.TaxRates.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (e is null) throw new KeyNotFoundException($"TaxRate {id} not found.");

            var code = NormalizeCode(dto.Code);

            var exists = await _db.TaxRates.AnyAsync(x => x.Code == code && x.Id != id, ct);
            if (exists) throw new InvalidOperationException($"Tax rate code '{code}' already exists.");

            var rate = Clamp01(dto.Rate);
            rate = Math.Round(rate, 4, MidpointRounding.AwayFromZero);

            e.Code = code;
            e.Rate = rate;
            e.IsActive = dto.IsActive;

            await _db.SaveChangesAsync(ct);
        }

        // --- DEACTIVATE TAX RATE ---
        public async Task<bool> DeactivateAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.TaxRates.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (e is null) return false;

            e.IsActive = false;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- ACTIVATE TAX RATE ---
        public async Task<bool> ActivateAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.TaxRates.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (e is null) return false;

            e.IsActive = true;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- HELPERS ---
        private static string NormalizeCode(string raw)
            => (raw ?? string.Empty).Trim().ToUpperInvariant();

        private static decimal Clamp01(decimal v)
        {
            if (v < 0m) return 0m;
            if (v > 1m) return 1m;
            return v;
        }
    }
}
