using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;

namespace Backend.Api.Api.Services
{
    public interface IShipmentService
    {
        Task<PagedResult<GetShipmentListItemDto>> GetAllAsync(
            string? q = null,
            ShipmentType? type = null,
            List<ShipmentStatus>? statuses = null,
            DateTimeOffset? sendDateFrom = null,
            DateTimeOffset? sendDateTo = null,
            DateTimeOffset? deliveryDateFrom = null,
            DateTimeOffset? deliveryDateTo = null,
            string? orderBy = null,
            string? sortDirection = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default);

        Task<GetShipmentDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<GetShipmentDto> CreateAsync(CreateShipmentDto dto, CancellationToken ct = default);
        Task UpdateAsync(int id, UpdateShipmentDto dto, CancellationToken ct = default);
        Task UpdateStatusAsync(int id, UpdateShipmentStatusDto dto, CancellationToken ct = default);
        Task AddProductsAsync(int shipmentId, List<ShipmentProductItemDto> products, CancellationToken ct = default);
        Task RemoveProductsAsync(int shipmentId, List<int> productIds, CancellationToken ct = default);
        Task DeleteAsync(int id, CancellationToken ct = default);

        // Collection tracking methods
        Task CompleteCollectionAsync(int shipmentId, CompleteCollectionDto dto, int userId, CancellationToken ct = default);
        Task<List<GetShipmentProductCollectionGroupedDto>> GetShipmentProductCollectionAsync(int shipmentId, CancellationToken ct = default);
    }
}
