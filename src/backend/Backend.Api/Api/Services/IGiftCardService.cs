using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;

namespace Backend.Api.Api.Services
{
    public interface IGiftCardService
    {
        Task<PagedResult<GetGiftCardListItemDto>> GetAllAsync(
            string? code,
            bool? isActive,
            string? orderBy,
            string? sortDirection,
            PaginationParams pagination,
            CancellationToken ct = default);

        Task<GetGiftCardDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<GetGiftCardDto?> GetByCodeAsync(string code, CancellationToken ct = default);
        Task<GiftCardValidationResultDto> ValidateGiftCardAsync(string code, CancellationToken ct = default);
        Task<GetGiftCardDto> CreateAsync(CreateGiftCardDto dto, CancellationToken ct = default);
        Task<GetGiftCardDto> UseGiftCardAsync(UseGiftCardDto dto, CancellationToken ct = default);
        Task DeactivateAsync(int id, CancellationToken ct = default);
    }
}
