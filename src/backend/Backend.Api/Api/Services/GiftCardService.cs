using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public class GiftCardService : IGiftCardService
    {
        private readonly AppDbContext _db;
        private static readonly Random _random = new();

        public GiftCardService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<PagedResult<GetGiftCardListItemDto>> GetAllAsync(
            string? code,
            bool? isActive,
            string? orderBy,
            string? sortDirection,
            PaginationParams pagination,
            CancellationToken ct = default)
        {
            var query = _db.GiftCards.AsQueryable();

            // Filter by code
            if (!string.IsNullOrWhiteSpace(code))
            {
                query = query.Where(g => g.Code.Contains(code));
            }

            // Filter by isActive
            if (isActive.HasValue)
            {
                query = query.Where(g => g.IsActive == isActive.Value);
            }

            // Sorting
            query = (orderBy?.ToLower(), sortDirection?.ToLower()) switch
            {
                ("value", "desc") => query.OrderByDescending(g => g.Value),
                ("value", _) => query.OrderBy(g => g.Value),
                ("dateissued", "desc") => query.OrderByDescending(g => g.DateIssued),
                ("dateissued", _) => query.OrderBy(g => g.DateIssued),
                ("datevaliduntil", "desc") => query.OrderByDescending(g => g.DateValidUntil),
                ("datevaliduntil", _) => query.OrderBy(g => g.DateValidUntil),
                ("isactive", "desc") => query.OrderByDescending(g => g.IsActive),
                ("isactive", _) => query.OrderBy(g => g.IsActive),
                _ => query.OrderByDescending(g => g.DateIssued)
            };

            // Map to DTO
            var dtoQuery = query.Select(g => new GetGiftCardListItemDto
            {
                Id = g.Id,
                Code = g.Code,
                Value = g.Value,
                DateIssued = g.DateIssued,
                DateValidUntil = g.DateValidUntil,
                IsActive = g.IsActive
            });

            return await dtoQuery.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        public async Task<GetGiftCardDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var giftCard = await _db.GiftCards.FirstOrDefaultAsync(g => g.Id == id, ct);

            if (giftCard == null)
                return null;

            return new GetGiftCardDto
            {
                Id = giftCard.Id,
                DateIssued = giftCard.DateIssued,
                DateValidUntil = giftCard.DateValidUntil,
                Value = giftCard.Value,
                Code = giftCard.Code,
                IsActive = giftCard.IsActive
            };
        }

        public async Task<GetGiftCardDto?> GetByCodeAsync(string code, CancellationToken ct = default)
        {
            var giftCard = await _db.GiftCards.FirstOrDefaultAsync(g => g.Code == code, ct);

            if (giftCard == null)
                return null;

            return new GetGiftCardDto
            {
                Id = giftCard.Id,
                DateIssued = giftCard.DateIssued,
                DateValidUntil = giftCard.DateValidUntil,
                Value = giftCard.Value,
                Code = giftCard.Code,
                IsActive = giftCard.IsActive
            };
        }

        public async Task<GiftCardValidationResultDto> ValidateGiftCardAsync(string code, CancellationToken ct = default)
        {
            var giftCard = await _db.GiftCards.FirstOrDefaultAsync(g => g.Code == code, ct);

            if (giftCard == null)
            {
                return new GiftCardValidationResultDto
                {
                    IsValid = false,
                    ErrorMessage = "Gift card not found"
                };
            }

            if (!giftCard.IsActive)
            {
                return new GiftCardValidationResultDto
                {
                    IsValid = false,
                    ErrorMessage = "Gift card is not active"
                };
            }

            if (giftCard.DateValidUntil < DateTimeOffset.Now)
            {
                return new GiftCardValidationResultDto
                {
                    IsValid = false,
                    ErrorMessage = "Gift card has expired"
                };
            }

            if (giftCard.Value <= 0)
            {
                return new GiftCardValidationResultDto
                {
                    IsValid = false,
                    ErrorMessage = "Gift card has no remaining value"
                };
            }

            return new GiftCardValidationResultDto
            {
                IsValid = true,
                GiftCardId = giftCard.Id,
                Value = giftCard.Value
            };
        }

        public async Task<GetGiftCardDto> CreateAsync(CreateGiftCardDto dto, CancellationToken ct = default)
        {
            var now = DateTimeOffset.Now;
            var validUntil = now.AddYears(2);

            // Use temporary unique code to satisfy unique constraint during first save
            var tempCode = $"TEMP_{Guid.NewGuid():N}";

            var giftCard = new GiftCard
            {
                DateIssued = now,
                DateValidUntil = validUntil,
                Value = dto.Value,
                IsActive = true,
                Code = tempCode // Temporary unique code, will be replaced after save
            };

            _db.GiftCards.Add(giftCard);
            await _db.SaveChangesAsync(ct);

            // Generate final code after ID is assigned
            giftCard.Code = GenerateGiftCardCode(giftCard.Id, giftCard.DateIssued, giftCard.DateValidUntil);
            await _db.SaveChangesAsync(ct);

            return new GetGiftCardDto
            {
                Id = giftCard.Id,
                DateIssued = giftCard.DateIssued,
                DateValidUntil = giftCard.DateValidUntil,
                Value = giftCard.Value,
                Code = giftCard.Code,
                IsActive = giftCard.IsActive
            };
        }

        public async Task<GetGiftCardDto> UseGiftCardAsync(UseGiftCardDto dto, CancellationToken ct = default)
        {
            var giftCard = await _db.GiftCards.FindAsync(new object[] { dto.GiftCardId }, ct);

            if (giftCard == null)
                throw new InvalidOperationException("Gift card not found");

            if (!giftCard.IsActive)
                throw new InvalidOperationException("Gift card is not active");

            if (giftCard.Value < dto.Amount)
                throw new InvalidOperationException($"Insufficient gift card balance. Remaining: ${giftCard.Value:F2}");

            // Deduct amount from value
            giftCard.Value -= dto.Amount;

            // Deactivate if balance reaches zero
            if (giftCard.Value <= 0)
            {
                giftCard.IsActive = false;
                giftCard.Value = 0;
            }

            await _db.SaveChangesAsync(ct);

            return new GetGiftCardDto
            {
                Id = giftCard.Id,
                DateIssued = giftCard.DateIssued,
                DateValidUntil = giftCard.DateValidUntil,
                Value = giftCard.Value,
                Code = giftCard.Code,
                IsActive = giftCard.IsActive
            };
        }

        public async Task DeactivateAsync(int id, CancellationToken ct = default)
        {
            var giftCard = await _db.GiftCards.FindAsync(new object[] { id }, ct);

            if (giftCard == null)
                throw new InvalidOperationException("Gift card not found");

            giftCard.IsActive = false;
            await _db.SaveChangesAsync(ct);
        }

        /// <summary>
        /// Generates a unique gift card code
        /// Format: YYYYMMDD (issued) + YYYYMMDD (valid until) + 6-digit ID + 3-digit random
        /// Example: 20260101202801010000013XX
        /// </summary>
        private string GenerateGiftCardCode(int id, DateTimeOffset dateIssued, DateTimeOffset dateValidUntil)
        {
            var issuedDate = dateIssued.ToString("yyyyMMdd");
            var validDate = dateValidUntil.ToString("yyyyMMdd");
            var idPart = id.ToString("D6"); // 6 digits, zero-padded
            var randomPart = _random.Next(100, 1000).ToString(); // 3-digit random number

            return $"{issuedDate}{validDate}{idPart}{randomPart}";
        }
    }
}
