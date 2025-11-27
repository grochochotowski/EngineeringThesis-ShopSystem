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
        Task<PagedResult<GetCategoryDto>> GetAllAsync(PaginationParams pagination, bool? isActive = null, string? orderBy = null, string? sortDirection = null, CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateCategoryDto dto, CancellationToken ct = default);
        Task<bool> DeactivateAsync(int id, CancellationToken ct = default);
        Task<bool> ActivateAsync(int id, CancellationToken ct = default);
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
                Description = dto.Description,
                IsActive = true
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
        public async Task<PagedResult<GetCategoryDto>> GetAllAsync(PaginationParams pagination, bool? isActive = null, string? orderBy = null, string? sortDirection = null, CancellationToken ct = default)
        {
            var query = _db.Categories.AsNoTracking();

            if (isActive.HasValue)
            {
                query = query.Where(c => c.IsActive == isActive.Value);
            }

            // Sorting
            var isDescending = sortDirection?.ToLower() == "desc";

            query = orderBy?.ToLower() switch
            {
                "name" => isDescending ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name),
                "description" => isDescending ? query.OrderByDescending(c => c.Description) : query.OrderBy(c => c.Description),
                "isactive" => isDescending ? query.OrderByDescending(c => c.IsActive) : query.OrderBy(c => c.IsActive),
                _ => isDescending ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name) // Default sort if no orderBy is provided or recognized
            };

            var projectedQuery = query.Select(c => new GetCategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Description = c.Description,
                    IsActive = c.IsActive
                });

            return await projectedQuery.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
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

        // --- DEACTIVATE CATEGORY ---
        public async Task<bool> DeactivateAsync(int id, CancellationToken ct = default)
        {
            var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (category is null) return false;

            if (category.Name == "Default")
                throw new InvalidOperationException("Cannot deactivate the 'Default' category.");

            category.IsActive = false;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- ACTIVATE CATEGORY ---
        public async Task<bool> ActivateAsync(int id, CancellationToken ct = default)
        {
            var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (category is null) return false;

            category.IsActive = true;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DTO MAPPING ---
        private static GetCategoryDto ToGetDto(Category c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            IsActive = c.IsActive
        };
    }
}
