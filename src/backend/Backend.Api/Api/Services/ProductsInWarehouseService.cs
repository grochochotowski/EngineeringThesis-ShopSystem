using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface IProductsInWarehouseService
    {
        Task<bool> AddProductToLocationAsync(int productId, int locationId, int quantity, int userId, CancellationToken ct = default);
        Task<bool> RemoveProductFromLocationAsync(int productId, int locationId, int quantityToRemove, int userId, CancellationToken ct = default);
        Task<bool> TransferProductAsync(int productId, int fromLocationId, int toLocationId, int quantity, int userId, CancellationToken ct = default);
        Task<PagedResult<ProductSearchResultDto>> SearchProductAsync(string? searchTerm, PaginationParams pagination, CancellationToken ct = default);
        Task<PagedResult<ProductLocationRowDto>> SearchProductLocationRowsAsync(
            string? searchTerm,
            int? categoryId,
            int? locationId,
            decimal? minPrice,
            decimal? maxPrice,
            int? minQuantity,
            int? maxQuantity,
            string? orderBy,
            string? sortDirection,
            PaginationParams pagination,
            CancellationToken ct = default);
        Task<PagedResult<ProductWithLocationsDto>> SearchProductsWithLocationsAsync(
            string? searchTerm,
            int? categoryId,
            int? locationId,
            decimal? minPrice,
            decimal? maxPrice,
            int? minQuantity,
            int? maxQuantity,
            string? orderBy,
            string? sortDirection,
            PaginationParams pagination,
            CancellationToken ct = default);
        Task<PagedResult<LocationProductsResultDto>> SearchByLocationAsync(string locationCodePart, PaginationParams pagination, CancellationToken ct = default);
        Task<List<ProductLocationInfoDto>> GetLocationsByProductIdAsync(int productId, CancellationToken ct = default);
    }

    public class ProductsInWarehouseService : IProductsInWarehouseService
    {
        private readonly AppDbContext _db;
        private readonly IInventoryChangeService _inventoryChangeService;

        public ProductsInWarehouseService(AppDbContext db, IInventoryChangeService inventoryChangeService)
        {
            _db = db;
            _inventoryChangeService = inventoryChangeService;
        }

        // --- ADD PRODUCT TO LOCATION ---
        public async Task<bool> AddProductToLocationAsync(int productId, int locationId, int quantity, int userId, CancellationToken ct = default)
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

            // Log inventory change
            await _inventoryChangeService.LogInventoryChangeAsync(
                changeType: Objects.Entities.Enums.InventoryChangeType.Add,
                productId: productId,
                quantity: quantity,
                fromLocationId: null,
                toLocationId: locationId,
                userId: userId,
                notes: $"Manual addition of {quantity} units to warehouse",
                ct: ct);

            return true;
        }

        // --- REMOVE PRODUCT FROM LOCATION ---
        public async Task<bool> RemoveProductFromLocationAsync(int productId, int locationId, int quantityToRemove, int userId, CancellationToken ct = default)
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

            // Log inventory change (negative quantity for removal)
            await _inventoryChangeService.LogInventoryChangeAsync(
                changeType: Objects.Entities.Enums.InventoryChangeType.Remove,
                productId: productId,
                quantity: -quantityToRemove,
                fromLocationId: locationId,
                toLocationId: null,
                userId: userId,
                notes: $"Manual removal of {quantityToRemove} units from warehouse",
                ct: ct);

            return true;
        }

        // --- TRANSFER PRODUCT BETWEEN LOCATIONS ---
        public async Task<bool> TransferProductAsync(int productId, int fromLocationId, int toLocationId, int quantity, int userId, CancellationToken ct = default)
        {
            // Validate product exists
            if (!await _db.Products.AnyAsync(p => p.Id == productId, ct))
                throw new ArgumentException($"Product with ID {productId} not found.");

            // Validate locations exist
            if (!await _db.Locations.AnyAsync(l => l.Id == fromLocationId, ct))
                throw new ArgumentException($"From location with ID {fromLocationId} not found.");

            if (!await _db.Locations.AnyAsync(l => l.Id == toLocationId, ct))
                throw new ArgumentException($"To location with ID {toLocationId} not found.");

            // Ensure locations are different
            if (fromLocationId == toLocationId)
                throw new InvalidOperationException("Source and destination locations must be different.");

            // Get product at source location
            var fromEntry = await _db.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.LocationId == fromLocationId, ct);

            if (fromEntry == null)
                throw new ArgumentException($"Product {productId} not found at location {fromLocationId}.");

            if (quantity > fromEntry.Quantity)
                throw new InvalidOperationException($"Cannot transfer {quantity} items. Only {fromEntry.Quantity} available at source location.");

            // Get or create product at destination location
            var toEntry = await _db.ProductsInWarehouse
                .FirstOrDefaultAsync(pw => pw.ProductId == productId && pw.LocationId == toLocationId, ct);

            // Remove from source
            if (quantity == fromEntry.Quantity)
            {
                _db.ProductsInWarehouse.Remove(fromEntry);
            }
            else
            {
                fromEntry.Quantity -= quantity;
                _db.ProductsInWarehouse.Update(fromEntry);
            }

            // Add to destination
            if (toEntry != null)
            {
                toEntry.Quantity += quantity;
                _db.ProductsInWarehouse.Update(toEntry);
            }
            else
            {
                var newEntry = new ProductsInWarehouse
                {
                    ProductId = productId,
                    LocationId = toLocationId,
                    Quantity = quantity
                };
                _db.ProductsInWarehouse.Add(newEntry);
            }

            await _db.SaveChangesAsync(ct);

            // Log inventory change (movement between locations)
            await _inventoryChangeService.LogInventoryChangeAsync(
                changeType: Objects.Entities.Enums.InventoryChangeType.Move,
                productId: productId,
                quantity: quantity,
                fromLocationId: fromLocationId,
                toLocationId: toLocationId,
                userId: userId,
                notes: $"Manual transfer of {quantity} units between locations",
                ct: ct);

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
                    (p.EAN != null && p.EAN == term) ||
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
                EAN = p.EAN,
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

        // --- SEARCH PRODUCT-LOCATION ROWS (FLATTENED) ---
        public async Task<PagedResult<ProductLocationRowDto>> SearchProductLocationRowsAsync(
            string? searchTerm,
            int? categoryId,
            int? locationId,
            decimal? minPrice,
            decimal? maxPrice,
            int? minQuantity,
            int? maxQuantity,
            string? orderBy,
            string? sortDirection,
            PaginationParams pagination,
            CancellationToken ct = default)
        {
            var query = _db.ProductsInWarehouse
                .AsNoTracking()
                .Include(pw => pw.Product)
                .ThenInclude(p => p.Category)
                .Include(pw => pw.Location)
                .Where(pw => pw.Product.IsActive) // Only show active products
                .AsQueryable();

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim().ToLower();
                query = query.Where(pw =>
                    pw.Product.Name.ToLower().Contains(term) ||
                    pw.Product.SKU.ToLower().Contains(term) ||
                    (pw.Product.EAN != null && pw.Product.EAN == term) ||
                    pw.Product.Description.ToLower().Contains(term) ||
                    pw.Location.LocationCode.ToLower().Contains(term));
            }

            // Apply category filter
            if (categoryId.HasValue)
            {
                query = query.Where(pw => pw.Product.CategoryId == categoryId.Value);
            }

            // Apply location filter
            if (locationId.HasValue)
            {
                query = query.Where(pw => pw.LocationId == locationId.Value);
            }

            // Apply price filters
            if (minPrice.HasValue)
            {
                query = query.Where(pw => pw.Product.Price >= minPrice.Value);
            }
            if (maxPrice.HasValue)
            {
                query = query.Where(pw => pw.Product.Price <= maxPrice.Value);
            }

            // Apply quantity filters
            if (minQuantity.HasValue)
            {
                query = query.Where(pw => pw.Quantity >= minQuantity.Value);
            }
            if (maxQuantity.HasValue)
            {
                query = query.Where(pw => pw.Quantity <= maxQuantity.Value);
            }

            // Apply sorting
            if (!string.IsNullOrWhiteSpace(orderBy))
            {
                var isDescending = sortDirection?.ToLower() == "desc";
                query = orderBy.ToLower() switch
                {
                    "productname" or "name" => isDescending ? query.OrderByDescending(pw => pw.Product.Name) : query.OrderBy(pw => pw.Product.Name),
                    "productprice" or "price" => isDescending ? query.OrderByDescending(pw => pw.Product.Price) : query.OrderBy(pw => pw.Product.Price),
                    "quantity" => isDescending ? query.OrderByDescending(pw => pw.Quantity) : query.OrderBy(pw => pw.Quantity),
                    "locationcode" => isDescending ? query.OrderByDescending(pw => pw.Location.LocationCode) : query.OrderBy(pw => pw.Location.LocationCode),
                    "categoryname" or "category" => isDescending ? query.OrderByDescending(pw => pw.Product.Category.Name) : query.OrderBy(pw => pw.Product.Category.Name),
                    _ => query.OrderBy(pw => pw.Product.Name) // Default sort
                };
            }
            else
            {
                query = query.OrderBy(pw => pw.Product.Name); // Default sort
            }

            // Get total count before pagination
            var totalCount = await query.CountAsync(ct);

            // Apply pagination
            var items = await query
                .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .Select(pw => new ProductLocationRowDto
                {
                    ProductId = pw.ProductId,
                    ProductName = pw.Product.Name,
                    ProductSKU = pw.Product.SKU,
                    ProductPrice = pw.Product.Price,
                    ProductDescription = pw.Product.Description,
                    CategoryId = pw.Product.CategoryId,
                    CategoryName = pw.Product.Category.Name,
                    LocationId = pw.LocationId,
                    LocationCode = pw.Location.LocationCode,
                    Quantity = pw.Quantity
                })
                .ToListAsync(ct);

            return new PagedResult<ProductLocationRowDto>
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

        // --- SEARCH PRODUCTS WITH LOCATIONS (AGGREGATED) ---
        public async Task<PagedResult<ProductWithLocationsDto>> SearchProductsWithLocationsAsync(
            string? searchTerm,
            int? categoryId,
            int? locationId,
            decimal? minPrice,
            decimal? maxPrice,
            int? minQuantity,
            int? maxQuantity,
            string? orderBy,
            string? sortDirection,
            PaginationParams pagination,
            CancellationToken ct = default)
        {
            // Start by getting all product-location relationships that match our filters
            var query = _db.ProductsInWarehouse
                .AsNoTracking()
                .Include(pw => pw.Product)
                .ThenInclude(p => p.Category)
                .Include(pw => pw.Location)
                .Where(pw => pw.Product.IsActive)
                .AsQueryable();

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim().ToLower();
                query = query.Where(pw =>
                    pw.Product.Name.ToLower().Contains(term) ||
                    pw.Product.SKU.ToLower().Contains(term) ||
                    (pw.Product.EAN != null && pw.Product.EAN == term) ||
                    pw.Product.Description.ToLower().Contains(term) ||
                    pw.Location.LocationCode.ToLower().Contains(term));
            }

            // Apply category filter
            if (categoryId.HasValue)
            {
                query = query.Where(pw => pw.Product.CategoryId == categoryId.Value);
            }

            // Apply location filter
            if (locationId.HasValue)
            {
                query = query.Where(pw => pw.LocationId == locationId.Value);
            }

            // Apply price filters
            if (minPrice.HasValue)
            {
                query = query.Where(pw => pw.Product.Price >= minPrice.Value);
            }
            if (maxPrice.HasValue)
            {
                query = query.Where(pw => pw.Product.Price <= maxPrice.Value);
            }

            // Apply quantity filters (on individual location quantities for filtering purposes)
            if (minQuantity.HasValue)
            {
                query = query.Where(pw => pw.Quantity >= minQuantity.Value);
            }
            if (maxQuantity.HasValue)
            {
                query = query.Where(pw => pw.Quantity <= maxQuantity.Value);
            }

            // Get all matching product-location records
            var allMatches = await query.ToListAsync(ct);

            // Group by product to aggregate locations
            var groupedProducts = allMatches
                .GroupBy(pw => new
                {
                    pw.ProductId,
                    pw.Product.Name,
                    pw.Product.SKU,
                    pw.Product.EAN,
                    pw.Product.Price,
                    pw.Product.Description,
                    pw.Product.CategoryId,
                    CategoryName = pw.Product.Category.Name
                })
                .Select(g => new
                {
                    ProductInfo = g.Key,
                    TotalQuantity = g.Sum(pw => pw.Quantity),
                    Locations = g.Select(pw => new ProductLocationBreakdownDto
                    {
                        LocationId = pw.LocationId,
                        LocationCode = pw.Location.LocationCode,
                        Quantity = pw.Quantity
                    }).ToList()
                })
                .ToList();

            // Apply quantity filters on total quantity if specified
            if (minQuantity.HasValue)
            {
                groupedProducts = groupedProducts.Where(p => p.TotalQuantity >= minQuantity.Value).ToList();
            }
            if (maxQuantity.HasValue)
            {
                groupedProducts = groupedProducts.Where(p => p.TotalQuantity <= maxQuantity.Value).ToList();
            }

            // Apply sorting
            if (!string.IsNullOrWhiteSpace(orderBy))
            {
                var isDescending = sortDirection?.ToLower() == "desc";
                groupedProducts = orderBy.ToLower() switch
                {
                    "productname" or "name" => isDescending
                        ? groupedProducts.OrderByDescending(p => p.ProductInfo.Name).ToList()
                        : groupedProducts.OrderBy(p => p.ProductInfo.Name).ToList(),
                    "productprice" or "price" => isDescending
                        ? groupedProducts.OrderByDescending(p => p.ProductInfo.Price).ToList()
                        : groupedProducts.OrderBy(p => p.ProductInfo.Price).ToList(),
                    "quantity" => isDescending
                        ? groupedProducts.OrderByDescending(p => p.TotalQuantity).ToList()
                        : groupedProducts.OrderBy(p => p.TotalQuantity).ToList(),
                    "locationcount" or "locations" => isDescending
                        ? groupedProducts.OrderByDescending(p => p.Locations.Count).ToList()
                        : groupedProducts.OrderBy(p => p.Locations.Count).ToList(),
                    "categoryname" or "category" => isDescending
                        ? groupedProducts.OrderByDescending(p => p.ProductInfo.CategoryName).ToList()
                        : groupedProducts.OrderBy(p => p.ProductInfo.CategoryName).ToList(),
                    _ => groupedProducts.OrderBy(p => p.ProductInfo.Name).ToList()
                };
            }
            else
            {
                groupedProducts = groupedProducts.OrderBy(p => p.ProductInfo.Name).ToList();
            }

            // Get total count of unique products
            var totalCount = groupedProducts.Count;

            // Apply pagination on unique products
            var pagedProducts = groupedProducts
                .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToList();

            // Map to DTOs
            var items = pagedProducts.Select(p => new ProductWithLocationsDto
            {
                ProductId = p.ProductInfo.ProductId,
                ProductName = p.ProductInfo.Name,
                ProductSKU = p.ProductInfo.SKU,
                ProductEAN = p.ProductInfo.EAN,
                ProductPrice = p.ProductInfo.Price,
                ProductDescription = p.ProductInfo.Description,
                CategoryId = p.ProductInfo.CategoryId,
                CategoryName = p.ProductInfo.CategoryName,
                TotalQuantity = p.TotalQuantity,
                Locations = p.Locations
            }).ToList();

            return new PagedResult<ProductWithLocationsDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize
            };
        }

        // --- GET LOCATIONS BY PRODUCT ID ---
        public async Task<List<ProductLocationInfoDto>> GetLocationsByProductIdAsync(int productId, CancellationToken ct = default)
        {
            // Validate product exists
            if (!await _db.Products.AnyAsync(p => p.Id == productId, ct))
                throw new ArgumentException($"Product with ID {productId} not found.");

            var locations = await _db.ProductsInWarehouse
                .AsNoTracking()
                .Include(pw => pw.Location)
                .Where(pw => pw.ProductId == productId)
                .Select(pw => new ProductLocationInfoDto
                {
                    LocationId = pw.LocationId,
                    LocationCode = pw.Location.LocationCode,
                    Quantity = pw.Quantity,
                    Zone = pw.Location.Zone,
                    Col = pw.Location.Col,
                    Shelf = pw.Location.Shelf
                })
                .ToListAsync(ct);

            return locations;
        }
    }
}
