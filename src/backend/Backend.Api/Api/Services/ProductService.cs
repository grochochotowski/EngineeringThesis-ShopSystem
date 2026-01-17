using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    public interface IProductService
    {
        Task<GetProductDto> CreateAsync(CreateProductDto dto, CancellationToken ct = default);
        Task<GetProductDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PagedResult<GetProductListItemDto>> GetAllAsync(
            string? q = null,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            int? categoryId = null,
            bool? defective = null,
            bool? isActive = null,
            string? orderBy = null,
            string? sortDirection = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default);

        Task<bool> UpdateAsync(int id, UpdateProductDto dto, CancellationToken ct = default);
        Task<bool> DeactivateAsync(int id, CancellationToken ct = default);
        Task<bool> RestoreAsync(int id, CancellationToken ct = default);
        Task<List<ActiveProductDto>> GetActiveProductsAsync(CancellationToken ct = default);
    }
    public class ProductService : IProductService
    {
        private readonly AppDbContext _db;
        public ProductService(AppDbContext db) => _db = db;

        // --- CRAETE PRODUCT ---
        public async Task<GetProductDto> CreateAsync(CreateProductDto dto, CancellationToken ct = default)
        {
            if (!await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId, ct))
                throw new InvalidOperationException("Category not found.");

            if (!await _db.TaxRates.AnyAsync(t => t.Id == dto.TaxRateId, ct))
                throw new InvalidOperationException("Tax rate not found.");

            if (await _db.Products.AnyAsync(p => p.SKU == dto.SKU, ct))
                throw new InvalidOperationException("SKU must be unique.");

            if (!string.IsNullOrWhiteSpace(dto.EAN) && await _db.Products.AnyAsync(p => p.EAN == dto.EAN, ct))
                throw new InvalidOperationException("EAN must be unique.");

            if (dto.Defective && string.IsNullOrWhiteSpace(dto.DefectDescription))
                throw new InvalidOperationException("DefectDescription is required when Defective is true.");

            var entity = new Product
            {
                SKU = dto.SKU.Trim(),
                EAN = dto.EAN?.Trim(),
                Name = dto.Name.Trim(),
                Description = dto.Description.Trim(),
                Price = dto.Price,
                Defective = dto.Defective,
                DefectDescription = dto.DefectDescription,
                CategoryId = dto.CategoryId,
                TaxRateId = dto.TaxRateId,
                IsActive = true
            };

            _db.Products.Add(entity);
            await _db.SaveChangesAsync(ct);
            return Map(entity);
        }

        // --- GET PRODUCT BY ID ---
        public async Task<GetProductDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var p = await _db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return p is null ? null : Map(p);
        }

        // --- GET ALL PRODUCTS (pagination and filters) ---
        public async Task<PagedResult<GetProductListItemDto>> GetAllAsync(
            string? q = null,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            int? categoryId = null,
            bool? defective = null,
            bool? isActive = null,
            string? orderBy = null,
            string? sortDirection = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default)
        {
            pagination ??= new PaginationParams();

            var qry = _db.Products.AsNoTracking().AsQueryable();

            // filter by active status
            if (isActive.HasValue)
                qry = qry.Where(p => p.IsActive == isActive.Value);

            // search
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                qry = qry.Where(p =>
                    p.SKU.ToLower().Contains(term) ||
                    (p.EAN != null && p.EAN == term) ||
                    p.Name.ToLower().Contains(term) ||
                    p.Description.ToLower().Contains(term));
            }

            // price range
            if (minPrice.HasValue) qry = qry.Where(p => p.Price >= minPrice.Value);
            if (maxPrice.HasValue) qry = qry.Where(p => p.Price <= maxPrice.Value);

            // category
            if (categoryId.HasValue) qry = qry.Where(p => p.CategoryId == categoryId.Value);

            // defective
            if (defective.HasValue) qry = qry.Where(p => p.Defective == defective.Value);

            // sorting
            var isDescending = sortDirection?.ToLower() == "desc";

            var queryWithCategory = from p in qry
                                    join c in _db.Categories on p.CategoryId equals c.Id into g
                                    from c in g.DefaultIfEmpty()
                                    select new { Product = p, CategoryName = c.Name };

            switch (orderBy?.ToLower())
            {
                case "sku":
                    queryWithCategory = isDescending ? queryWithCategory.OrderByDescending(x => x.Product.SKU) : queryWithCategory.OrderBy(x => x.Product.SKU);
                    break;
                case "name":
                    queryWithCategory = isDescending ? queryWithCategory.OrderByDescending(x => x.Product.Name) : queryWithCategory.OrderBy(x => x.Product.Name);
                    break;
                case "price":
                    queryWithCategory = isDescending ? queryWithCategory.OrderByDescending(x => x.Product.Price) : queryWithCategory.OrderBy(x => x.Product.Price);
                    break;
                case "category":
                    queryWithCategory = isDescending ? queryWithCategory.OrderByDescending(x => x.CategoryName) : queryWithCategory.OrderBy(x => x.CategoryName);
                    break;
                case "isactive":
                    queryWithCategory = isDescending ? queryWithCategory.OrderByDescending(x => x.Product.IsActive) : queryWithCategory.OrderBy(x => x.Product.IsActive);
                    break;
                case "defective":
                    queryWithCategory = isDescending ? queryWithCategory.OrderByDescending(x => x.Product.Defective) : queryWithCategory.OrderBy(x => x.Product.Defective);
                    break;
                default:
                    queryWithCategory = queryWithCategory.OrderBy(x => x.Product.Name);
                    break;
            }

            // convert to simple list
            var projected = queryWithCategory
                .Select(x => new GetProductListItemDto
                {
                    Id = x.Product.Id,
                    SKU = x.Product.SKU,
                    EAN = x.Product.EAN,
                    Name = x.Product.Name,
                    Price = x.Product.Price,
                    Defective = x.Product.Defective,
                    CategoryId = x.Product.CategoryId,
                    TaxRateId = x.Product.TaxRateId,
                    IsActive = x.Product.IsActive
                });

            return await projected.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        // --- UPDTAE PRODUCT ---
        public async Task<bool> UpdateAsync(int id, UpdateProductDto dto, CancellationToken ct = default)
        {
            var e = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (e is null) return false;

            if (!string.Equals(e.SKU, dto.SKU, StringComparison.OrdinalIgnoreCase))
            {
                if (await _db.Products.AnyAsync(p => p.SKU == dto.SKU && p.Id != id, ct))
                    throw new InvalidOperationException("SKU must be unique.");
            }

            if (!string.IsNullOrWhiteSpace(dto.EAN) && !string.Equals(e.EAN, dto.EAN, StringComparison.OrdinalIgnoreCase))
            {
                if (await _db.Products.AnyAsync(p => p.EAN == dto.EAN && p.Id != id, ct))
                    throw new InvalidOperationException("EAN must be unique.");
            }

            if (!await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId, ct))
                throw new InvalidOperationException("Category not found.");

            if (!await _db.TaxRates.AnyAsync(t => t.Id == dto.TaxRateId, ct))
                throw new InvalidOperationException("Tax rate not found.");

            if (dto.Defective && string.IsNullOrWhiteSpace(dto.DefectDescription))
                throw new InvalidOperationException("DefectDescription is required when Defective is true.");

            e.SKU = dto.SKU.Trim();
            e.EAN = dto.EAN?.Trim();
            e.Name = dto.Name.Trim();
            e.Description = dto.Description.Trim();
            e.Price = dto.Price;
            e.Defective = dto.Defective;
            e.DefectDescription = dto.DefectDescription;
            e.CategoryId = dto.CategoryId;
            e.TaxRateId = dto.TaxRateId;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DEACTIVATE PRODUCT ---
        public async Task<bool> DeactivateAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (e is null) return false;

            if (!e.IsActive)
                throw new InvalidOperationException("Product is already deactivated.");

            e.IsActive = false;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- RESTORE PRODUCT ---
        public async Task<bool> RestoreAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (e is null) return false;

            if (e.IsActive)
                throw new InvalidOperationException("Product is already active.");

            e.IsActive = true;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- GET ACTIVE PRODUCTS ---
        public async Task<List<ActiveProductDto>> GetActiveProductsAsync(CancellationToken ct = default)
        {
            var products = await _db.Products
                .AsNoTracking()
                .Where(p => p.IsActive)
                .OrderBy(p => p.Name)
                .Select(p => new ActiveProductDto
                {
                    ProductId = p.Id,
                    SKU = p.SKU,
                    EAN = p.EAN,
                    Name = p.Name
                })
                .ToListAsync(ct);

            return products;
        }

        // --- MAPPER ---
        private static GetProductDto Map(Product p) => new()
        {
            Id = p.Id,
            SKU = p.SKU,
            EAN = p.EAN,
            Name = p.Name,
            Description = p.Description,
            Price = p.Price,
            Defective = p.Defective,
            DefectDescription = p.DefectDescription,
            CategoryId = p.CategoryId,
            TaxRateId = p.TaxRateId,
            IsActive = p.IsActive
        };
    }
}