using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface IProductsInWarehouseService
    {
        Task<bool> AddProductToLocationAsync(int productId, int locationId, int quantity, CancellationToken ct = default);
        Task<bool> RemoveProductFromLocationAsync(int productId, int locationId, int quantityToRemove, CancellationToken ct = default);
        Task<PagedResult<ProductSearchResultDto>> SearchProductAsync(string? searchTerm, PaginationParams pagination, CancellationToken ct = default);
        Task<PagedResult<LocationProductsResultDto>> SearchByLocationAsync(string locationCodePart, PaginationParams pagination, CancellationToken ct = default);
    }

    public class ProductsInWarehouseService : IProductsInWarehouseService
    {
        private readonly AppDbContext _db;
        public ProductsInWarehouseService(AppDbContext db) => _db = db;

        // --- ADD PRODUCT TO LOCATION ---
        public async Task<bool> AddProductToLocationAsync(int productId, int locationId, int quantity, CancellationToken ct = default)
        {
            // Validate product exists
            if (!await _db.Products.AnyAsync(p => p.Id == productId, ct))
                throw new ArgumentException($"Product with ID {productId} not found.");

            // Validate location exists
            if (!await _db.Locations.AnyAsync(l => l.Id == locationId, ct))
                throw new ArgumentException($"Location with ID {locationId} not found.");

            // Check if product already exists at this location
            var existing = await _db.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.LocationId == locationId, ct);

            if (existing != null)
            {
                // Increment quantity
                existing.Quantity += quantity;
                _db.ProductsInWarehouse.Update(existing);
            }
            else
            {
                // Create new entry
                var newEntry = new ProductsInWarehouse
                {
                    ProductId = productId,
                    LocationId = locationId,
                    Quantity = quantity
                };
                _db.ProductsInWarehouse.Add(newEntry);
            }

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- REMOVE PRODUCT FROM LOCATION ---
        public async Task<bool> RemoveProductFromLocationAsync(int productId, int locationId, int quantityToRemove, CancellationToken ct = default)
        {
            var entry = await _db.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.LocationId == locationId, ct);

            if (entry == null)
                throw new ArgumentException($"Product {productId} not found at location {locationId}.");

            if (quantityToRemove > entry.Quantity)
                throw new InvalidOperationException($"Cannot remove {quantityToRemove} items. Only {entry.Quantity} available at this location.");

            if (quantityToRemove == entry.Quantity)
            {
                // Remove entry entirely
                _db.ProductsInWarehouse.Remove(entry);
            }
            else
            {
                // Decrease quantity
                entry.Quantity -= quantityToRemove;
                _db.ProductsInWarehouse.Update(entry);
            }

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- SEARCH PRODUCT ---
        public async Task<PagedResult<ProductSearchResultDto>> SearchProductAsync(string? searchTerm, PaginationParams pagination, CancellationToken ct = default)
        {
            var query = _db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.ProductsInWarehouse)
                .ThenInclude(pw => pw.Location)
                .AsQueryable();

            // Apply search filter if searchTerm provided
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim().ToLower();
                query = query.Where(p =>
                    p.Name.ToLower().Contains(term) ||
                    p.SKU.ToLower().Contains(term) ||
                    p.Description.ToLower().Contains(term));
            }

            // Get total count before pagination
            var totalCount = await query.CountAsync(ct);

            // Apply pagination
            var products = await query
                .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync(ct);

            // Map to DTOs
            var items = products.Select(p => new ProductSearchResultDto
            {
                ProductId = p.Id,
                Name = p.Name,
                SKU = p.SKU,
                Price = p.Price,
                CategoryName = p.Category.Name,
                TotalQuantity = p.ProductsInWarehouse.Sum(pw => pw.Quantity),
                Locations = p.ProductsInWarehouse.Select(pw => new ProductLocationInfoDto
                {
                    LocationId = pw.LocationId,
                    LocationCode = pw.Location.LocationCode,
                    Quantity = pw.Quantity
                }).ToList()
            }).ToList();

            return new PagedResult<ProductSearchResultDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize
            };
        }

        // --- SEARCH BY LOCATION ---
        public async Task<PagedResult<LocationProductsResultDto>> SearchByLocationAsync(string locationCodePart, PaginationParams pagination, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(locationCodePart))
                throw new ArgumentException("Location code part cannot be empty.");

            var codePart = locationCodePart.Trim();
            var query = _db.Locations
                .AsNoTracking()
                .Include(l => l.Products)
                .ThenInclude(pw => pw.Product)
                .AsQueryable();

            // Parse location code part and apply filters
            if (codePart.Contains("-"))
            {
                // Format: Zone-Col-Shelf or partial like Zone-Col or Zone
                var parts = codePart.Split('-');

                if (parts.Length >= 1 && !string.IsNullOrWhiteSpace(parts[0]))
                    query = query.Where(l => l.Zone == parts[0]);

                if (parts.Length >= 2 && !string.IsNullOrWhiteSpace(parts[1]))
                    query = query.Where(l => l.Col == parts[1]);

                if (parts.Length >= 3 && !string.IsNullOrWhiteSpace(parts[2]))
                    query = query.Where(l => l.Shelf == parts[2]);
            }
            else if (codePart.Length == 4)
            {
                // Single 4-character code - could be Zone, Col, or Shelf
                query = query.Where(l => l.Zone == codePart || l.Col == codePart || l.Shelf == codePart);
            }
            else
            {
                // Partial match on any field
                query = query.Where(l =>
                    l.Zone.Contains(codePart) ||
                    l.Col.Contains(codePart) ||
                    l.Shelf.Contains(codePart) ||
                    l.LocationCode.Contains(codePart));
            }

            // Get total count before pagination
            var totalCount = await query.CountAsync(ct);

            // Apply pagination
            var locations = await query
                .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync(ct);

            // Map to DTOs
            var items = locations.Select(l => new LocationProductsResultDto
            {
                LocationId = l.Id,
                LocationCode = l.LocationCode,
                Zone = l.Zone,
                Col = l.Col,
                Shelf = l.Shelf,
                ProductCount = l.Products.Count,
                Products = l.Products.Select(pw => new LocationProductItemDto
                {
                    ProductId = pw.ProductId,
                    ProductName = pw.Product.Name,
                    ProductSKU = pw.Product.SKU,
                    Quantity = pw.Quantity
                }).ToList()
            }).ToList();

            return new PagedResult<LocationProductsResultDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize
            };
        }
    }
}
