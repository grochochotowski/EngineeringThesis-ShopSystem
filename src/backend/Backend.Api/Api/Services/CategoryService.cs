using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    public interface ICategoryService
    {
        Task<GetCategoryDto> CreateAsync(CreateCategoryDto dto, CancellationToken ct = default);
        Task<GetCategoryDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PagedResult<GetCategoryDto>> GetAllAsync(PaginationParams pagination, CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateCategoryDto dto, CancellationToken ct = default);
        Task<(bool canDelete, string? message)> DeleteAsync(int id, bool force = false, CancellationToken ct = default);
    }
    public class CategoryService : ICategoryService
    {
        private readonly AppDbContext _db;
        public CategoryService(AppDbContext db) => _db = db;

        // --- CREATE CATEGORY ---
        public async Task<GetCategoryDto> CreateAsync(CreateCategoryDto dto, CancellationToken ct = default)
        {
            var exists = await _db.Categories.AnyAsync(c => c.Name == dto.Name, ct);
            if (exists) throw new InvalidOperationException("Category with this name already exists.");

            var entity = new Category
            {
                Name = dto.Name,
                Description = dto.Description
            };

            _db.Categories.Add(entity);
            await _db.SaveChangesAsync(ct);

            return ToGetDto(entity);
        }

        // --- GET CATEGORY BY ID ---
        public async Task<GetCategoryDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
            return entity is null ? null : ToGetDto(entity);
        }

        // --- GET ALL CATEGORIES (paginated) ---
        public async Task<PagedResult<GetCategoryDto>> GetAllAsync(PaginationParams pagination, CancellationToken ct = default)
        {
            var query = _db.Categories
                .AsNoTracking()
                .OrderBy(c => c.Name)
                .Select(c => new GetCategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Description = c.Description
                });

            return await query.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        // --- UPDATE CATEGORY ---
        public async Task<bool> UpdateAsync(int id, UpdateCategoryDto dto, CancellationToken ct = default)
        {
            var entity = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (entity is null) return false;

            if (!string.Equals(entity.Name, dto.Name, StringComparison.Ordinal))
            {
                var nameTaken = await _db.Categories.AnyAsync(c => c.Name == dto.Name && c.Id != id, ct);
                if (nameTaken) throw new InvalidOperationException("Category with this name already exists.");
            }

            entity.Name = dto.Name;
            entity.Description = dto.Description;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DELETE CATEGORY (with product category handling) ---
        public async Task<(bool canDelete, string? message)> DeleteAsync(int id, bool force = false, CancellationToken ct = default)
        {
            var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (category is null) return (false, "Category not found.");

            // Check if any product uses this category
            var productCount = await _db.Products.CountAsync(p => p.CategoryId == id, ct);
            if (productCount > 0 && !force)
            {
                return (false, $"This category is used by {productCount} product(s). Set force=true to move them to Default category and delete this one.");
            }

            // If force is true, change products categories to "Default" 
            if (productCount > 0 && force)
            {
                var defaultCategory = await _db.Categories.FirstOrDefaultAsync(c => c.Name == "Default", ct)
                    ?? throw new InvalidOperationException("Default category not found.");

                await _db.Products
                    .Where(p => p.CategoryId == id)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.CategoryId, defaultCategory.Id), ct);
            }

            _db.Categories.Remove(category);
            await _db.SaveChangesAsync(ct);
            return (true, null);
        }

        // --- DTO MAPPING ---
        private static GetCategoryDto ToGetDto(Category c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description
        };
    }
}
