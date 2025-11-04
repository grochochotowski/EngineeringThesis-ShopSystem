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
            PaginationParams? pagination = null,
            CancellationToken ct = default);

        Task<bool> UpdateAsync(int id, UpdateProductDto dto, CancellationToken ct = default);
        Task<bool> DeactivateAsync(int id, CancellationToken ct = default);
        Task<bool> RestoreAsync(int id, CancellationToken ct = default);
    }
    public class ProductService : IProductService
    {
        private readonly AppDbContext _db;
        public ProductService(AppDbContext db) => _db = db;

        // --- CREATE PRODUCT ---
        public async Task<GetProductDto> CreateAsync(CreateProductDto dto, CancellationToken ct = default)
        {
            if (!await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId, ct))
                throw new InvalidOperationException("Category not found.");

            if (!await _db.TaxRates.AnyAsync(t => t.Id == dto.TaxRateId, ct))
                throw new InvalidOperationException("Tax rate not found.");

            if (await _db.Products.AnyAsync(p => p.SKU == dto.SKU, ct))
                throw new InvalidOperationException("SKU must be unique.");

            if (dto.Defective && string.IsNullOrWhiteSpace(dto.DefectDescription))
                throw new InvalidOperationException("DefectDescription is required when Defective is true.");

            var entity = new Product
            {
                SKU = dto.SKU.Trim(),
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

            // projection to lightweight list DTO
            var projected = qry
                .OrderBy(p => p.Name)
                .Select(p => new GetProductListItemDto
                {
                    SKU = p.SKU,
                    Name = p.Name,
                    Price = p.Price,
                    Defective = p.Defective,
                    CategoryId = p.CategoryId,
                    IsActive = p.IsActive
                });

            return await projected.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        // --- UPDATE PRODUCT ---
        public async Task<bool> UpdateAsync(int id, UpdateProductDto dto, CancellationToken ct = default)
        {
            var e = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (e is null) return false;

            if (!string.Equals(e.SKU, dto.SKU, StringComparison.OrdinalIgnoreCase))
            {
                if (await _db.Products.AnyAsync(p => p.SKU == dto.SKU && p.Id != id, ct))
                    throw new InvalidOperationException("SKU must be unique.");
            }

            if (!await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId, ct))
                throw new InvalidOperationException("Category not found.");

            if (!await _db.TaxRates.AnyAsync(t => t.Id == dto.TaxRateId, ct))
                throw new InvalidOperationException("Tax rate not found.");

            if (dto.Defective && string.IsNullOrWhiteSpace(dto.DefectDescription))
                throw new InvalidOperationException("DefectDescription is required when Defective is true.");

            e.SKU = dto.SKU.Trim();
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

        // --- MAPPER ---
        private static GetProductDto Map(Product p) => new()
        {
            Id = p.Id,
            SKU = p.SKU,
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