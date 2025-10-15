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
        Task<IReadOnlyList<GetCategoryDto>> GetAllAsync(CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateCategoryDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    }
    public class CategoryService : ICategoryService
    {
        private readonly AppDbContext _db;
        public CategoryService(AppDbContext db) => _db = db;

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

        public async Task<GetCategoryDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
            return entity is null ? null : ToGetDto(entity);
        }

        public async Task<IReadOnlyList<GetCategoryDto>> GetAllAsync(CancellationToken ct = default)
        {
            var list = await _db.Categories
                .AsNoTracking()
                .OrderBy(c => c.Name)
                .ToListAsync(ct);

            return list.Select(ToGetDto).ToList();
        }

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

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (entity is null) return false;

            _db.Categories.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        private static GetCategoryDto ToGetDto(Category c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description
        };
    }
}
