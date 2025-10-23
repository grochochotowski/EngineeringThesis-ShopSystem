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

        Task<IReadOnlyList<GetProductDto>> GetAllAsync(
            string? q = null,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            int? categoryId = null,
            bool? defective = null,
            CancellationToken ct = default);

        Task<bool> UpdateAsync(int id, UpdateProductDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    }
    public class ProductService : IProductService
    {
        private readonly AppDbContext _db;
        public ProductService(AppDbContext db) => _db = db;

        public async Task<GetProductDto> CreateAsync(CreateProductDto dto, CancellationToken ct = default)
        {
            var categoryExists = await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId, ct);
            if (!categoryExists) throw new InvalidOperationException("Category not found.");

            var skuTaken = await _db.Products.AnyAsync(p => p.SKU == dto.SKU, ct);
            if (skuTaken) throw new InvalidOperationException("SKU must be unique.");

            if (dto.Defective && string.IsNullOrWhiteSpace(dto.DefectDescription))
                throw new InvalidOperationException("DefectDescription is required when Defective is true.");

            var entity = new Product
            {
                SKU = dto.SKU,
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                CategoryId = dto.CategoryId,
                Defective = dto.Defective,
                DefectDescription = dto.DefectDescription
            };

            _db.Products.Add(entity);
            await _db.SaveChangesAsync(ct);

            var categoryName = await _db.Categories
                .Where(c => c.Id == entity.CategoryId)
                .Select(c => c.Name)
                .FirstAsync(ct);

            return ToGetDto(entity, categoryName);
        }

        public async Task<GetProductDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var product = await _db.Products
                .AsNoTracking()
                .Where(p => p.Id == id)
                .Select(p => new
                {
                    Entity = p,
                    CategoryName = p.Category.Name
                })
                .FirstOrDefaultAsync(ct);

            return product is null ? null : ToGetDto(product.Entity, product.CategoryName);
        }

        public async Task<IReadOnlyList<GetProductDto>> GetAllAsync(
            string? q = null,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            int? categoryId = null,
            bool? defective = null,
            CancellationToken ct = default)
        {
            var qry = _db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                qry = qry.Where(p =>
                    p.SKU.Contains(term) ||
                    p.Name.Contains(term) ||
                    p.Description.Contains(term));
            }

            if (minPrice.HasValue)
                qry = qry.Where(p => p.Price >= minPrice.Value);

            if (maxPrice.HasValue)
                qry = qry.Where(p => p.Price <= maxPrice.Value);

            if (categoryId.HasValue)
                qry = qry.Where(p => p.CategoryId == categoryId.Value);

            if (defective.HasValue)
                qry = qry.Where(p => p.Defective == defective.Value);

            var list = await qry
                .OrderBy(p => p.Name)
                .Select(p => new GetProductDto
                {
                    Id = p.Id,
                    SKU = p.SKU,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    Defective = p.Defective,
                    DefectDescription = p.DefectDescription,
                    CategoryId = p.CategoryId,
                    TaxRateId = p.TaxRateId
                })
                .ToListAsync(ct);

            return list;
        }

        public async Task<bool> UpdateAsync(int id, UpdateProductDto dto, CancellationToken ct = default)
        {
            var entity = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (entity is null) return false;

            if (!string.Equals(entity.SKU, dto.SKU, StringComparison.Ordinal))
            {
                var skuTaken = await _db.Products.AnyAsync(p => p.SKU == dto.SKU && p.Id != id, ct);
                if (skuTaken) throw new InvalidOperationException("SKU must be unique.");
            }

            if (entity.CategoryId != dto.CategoryId)
            {
                var categoryExists = await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId, ct);
                if (!categoryExists) throw new InvalidOperationException("Category not found.");
            }

            if (dto.Defective && string.IsNullOrWhiteSpace(dto.DefectDescription))
                throw new InvalidOperationException("DefectDescription is required when Defective is true.");

            entity.SKU = dto.SKU;
            entity.Name = dto.Name;
            entity.Description = dto.Description;
            entity.Price = dto.Price;
            entity.CategoryId = dto.CategoryId;
            entity.Defective = dto.Defective;
            entity.DefectDescription = dto.DefectDescription;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (entity is null) return false;

            _db.Products.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        private static GetProductDto ToGetDto(Product p, string? categoryName) => new()
        {
            Id = p.Id,
            SKU = p.SKU,
            Name = p.Name,
            Description = p.Description,
            Price = p.Price,
            Defective = p.Defective,
            DefectDescription = p.DefectDescription,
            CategoryId = p.CategoryId,
            TaxRateId = p.TaxRateId
        };
    }
}