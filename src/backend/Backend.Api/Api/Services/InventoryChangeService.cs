using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Enums;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface IInventoryChangeService
    {
        Task LogInventoryChangeAsync(
            InventoryChangeType changeType,
            int productId,
            int quantity,
            int? fromLocationId,
            int? toLocationId,
            int userId,
            CancellationToken ct = default);

        Task<GetInventoryChangeDto?> GetByIdAsync(int id, CancellationToken ct = default);

        Task<PagedResult<GetInventoryChangeListItemDto>> GetAllAsync(
            InventoryChangeType? changeType = null,
            int? productId = null,
            int? locationId = null,
            int? userId = null,
            DateTime? from = null,
            DateTime? to = null,
            string? searchTerm = null,
            string? orderBy = null,
            string? sortDirection = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default);

        Task<PagedResult<GetInventoryChangeListItemDto>> GetByProductIdAsync(
            int productId,
            PaginationParams? pagination = null,
            CancellationToken ct = default);

        Task<PagedResult<GetInventoryChangeListItemDto>> GetByLocationIdAsync(
            int locationId,
            PaginationParams? pagination = null,
            CancellationToken ct = default);
    }

    public class InventoryChangeService : IInventoryChangeService
    {
        private readonly AppDbContext _db;

        public InventoryChangeService(AppDbContext db)
        {
            _db = db;
        }

        // --- LOG INVENTORY CHANGE ---
        public async Task LogInventoryChangeAsync(
            InventoryChangeType changeType,
            int productId,
            int quantity,
            int? fromLocationId,
            int? toLocationId,
            int userId,
            CancellationToken ct = default)
        {
            // Validate that at least one location is provided
            if (fromLocationId == null && toLocationId == null)
                throw new ArgumentException("At least one of FromLocationId or ToLocationId must be provided.");

            // Validate quantity is non-zero
            if (quantity == 0)
                throw new ArgumentException("Quantity must be non-zero.");

            // Fetch product details for denormalization
            var product = await _db.Products
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == productId, ct);

            if (product == null)
                throw new ArgumentException($"Product with ID {productId} not found.");

            // Validate user exists
            if (!await _db.Users.AnyAsync(u => u.Id == userId, ct))
                throw new ArgumentException($"User with ID {userId} not found.");

            // Validate locations exist if provided
            if (fromLocationId.HasValue && !await _db.Locations.AnyAsync(l => l.Id == fromLocationId.Value, ct))
                throw new ArgumentException($"FromLocation with ID {fromLocationId.Value} not found.");

            if (toLocationId.HasValue && !await _db.Locations.AnyAsync(l => l.Id == toLocationId.Value, ct))
                throw new ArgumentException($"ToLocation with ID {toLocationId.Value} not found.");

            // Create inventory change record
            var inventoryChange = new InventoryChange
            {
                ChangeType = changeType,
                ProductId = productId,
                ProductSku = product.SKU,
                ProductEan = product.EAN,
                Quantity = quantity,
                FromLocationId = fromLocationId,
                ToLocationId = toLocationId,
                UserId = userId,
                Timestamp = DateTime.UtcNow
            };

            _db.InventoryChanges.Add(inventoryChange);
            await _db.SaveChangesAsync(ct);
        }

        // --- GET BY ID ---
        public async Task<GetInventoryChangeDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var change = await _db.InventoryChanges
                .AsNoTracking()
                .Include(ic => ic.Product)
                .Include(ic => ic.FromLocation)
                .Include(ic => ic.ToLocation)
                .Include(ic => ic.User)
                .FirstOrDefaultAsync(ic => ic.Id == id, ct);

            if (change == null)
                return null;

            return new GetInventoryChangeDto
            {
                Id = change.Id,
                ChangeType = change.ChangeType,
                Quantity = change.Quantity,
                Timestamp = change.Timestamp,
                ProductId = change.ProductId,
                ProductSku = change.ProductSku,
                ProductEan = change.ProductEan,
                ProductName = change.Product.Name,
                FromLocationId = change.FromLocationId,
                FromLocationCode = change.FromLocation?.LocationCode,
                ToLocationId = change.ToLocationId,
                ToLocationCode = change.ToLocation?.LocationCode,
                UserId = change.UserId,
                UserName = $"{change.User.FirstName} {change.User.LastName}"
            };
        }

        // --- GET ALL WITH FILTERS ---
        public async Task<PagedResult<GetInventoryChangeListItemDto>> GetAllAsync(
            InventoryChangeType? changeType = null,
            int? productId = null,
            int? locationId = null,
            int? userId = null,
            DateTime? from = null,
            DateTime? to = null,
            string? searchTerm = null,
            string? orderBy = null,
            string? sortDirection = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default)
        {
            pagination ??= new PaginationParams();

            var query = _db.InventoryChanges
                .AsNoTracking()
                .Include(ic => ic.Product)
                .Include(ic => ic.FromLocation)
                .Include(ic => ic.ToLocation)
                .Include(ic => ic.User)
                .AsQueryable();

            // Apply filters
            if (changeType.HasValue)
                query = query.Where(ic => ic.ChangeType == changeType.Value);

            if (productId.HasValue)
                query = query.Where(ic => ic.ProductId == productId.Value);

            if (locationId.HasValue)
                query = query.Where(ic => ic.FromLocationId == locationId.Value || ic.ToLocationId == locationId.Value);

            if (userId.HasValue)
                query = query.Where(ic => ic.UserId == userId.Value);

            if (from.HasValue)
                query = query.Where(ic => ic.Timestamp >= from.Value);

            if (to.HasValue)
                query = query.Where(ic => ic.Timestamp <= to.Value);

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim().ToLower();
                query = query.Where(ic =>
                    ic.ProductSku.ToLower().Contains(term) ||
                    ic.Product.Name.ToLower().Contains(term) ||
                    (ic.ProductEan != null && ic.ProductEan.ToLower().Contains(term)));
            }

            // Apply sorting
            query = ApplySorting(query, orderBy, sortDirection);

            // Get total count before pagination
            var totalCount = await query.CountAsync(ct);

            // Apply pagination and map to DTOs
            var items = await query
                .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .Select(ic => new GetInventoryChangeListItemDto
                {
                    Id = ic.Id,
                    ChangeType = ic.ChangeType,
                    Quantity = ic.Quantity,
                    Timestamp = ic.Timestamp,
                    ProductSku = ic.ProductSku,
                    ProductEan = ic.ProductEan,
                    ProductName = ic.Product.Name,
                    FromLocationCode = ic.FromLocation != null ? ic.FromLocation.LocationCode : null,
                    ToLocationCode = ic.ToLocation != null ? ic.ToLocation.LocationCode : null,
                    UserName = $"{ic.User.FirstName} {ic.User.LastName}"
                })
                .ToListAsync(ct);

            return new PagedResult<GetInventoryChangeListItemDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize
            };
        }

        // --- GET BY PRODUCT ID ---
        public async Task<PagedResult<GetInventoryChangeListItemDto>> GetByProductIdAsync(
            int productId,
            PaginationParams? pagination = null,
            CancellationToken ct = default)
        {
            return await GetAllAsync(
                productId: productId,
                pagination: pagination,
                ct: ct);
        }

        // --- GET BY LOCATION ID ---
        public async Task<PagedResult<GetInventoryChangeListItemDto>> GetByLocationIdAsync(
            int locationId,
            PaginationParams? pagination = null,
            CancellationToken ct = default)
        {
            return await GetAllAsync(
                locationId: locationId,
                pagination: pagination,
                ct: ct);
        }

        // --- HELPER: Apply sorting ---
        private IQueryable<InventoryChange> ApplySorting(
            IQueryable<InventoryChange> query,
            string? orderBy,
            string? sortDirection)
        {
            var isDescending = sortDirection?.Equals("desc", StringComparison.OrdinalIgnoreCase) ?? false;

            return orderBy?.ToLower() switch
            {
                "timestamp" or "date" => isDescending
                    ? query.OrderByDescending(ic => ic.Timestamp)
                    : query.OrderBy(ic => ic.Timestamp),
                "changetype" or "type" => isDescending
                    ? query.OrderByDescending(ic => ic.ChangeType)
                    : query.OrderBy(ic => ic.ChangeType),
                "quantity" => isDescending
                    ? query.OrderByDescending(ic => ic.Quantity)
                    : query.OrderBy(ic => ic.Quantity),
                "productname" or "product" => isDescending
                    ? query.OrderByDescending(ic => ic.Product.Name)
                    : query.OrderBy(ic => ic.Product.Name),
                "productsku" or "sku" => isDescending
                    ? query.OrderByDescending(ic => ic.ProductSku)
                    : query.OrderBy(ic => ic.ProductSku),
                _ => query.OrderByDescending(ic => ic.Timestamp) // Default: newest first
            };
        }
    }
}
