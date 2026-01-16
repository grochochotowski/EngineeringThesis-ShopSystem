using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface ILocationService
    {
        Task<PagedResult<GetLocationDto>> GetAllLocationsAsync(PaginationParams pagination, string? searchQuery = null, string? zoneFilter = null, string? orderBy = null, string? sortDirection = null, CancellationToken ct = default);
        Task<GetLocationDto?> GetLocationByIdAsync(int id, CancellationToken ct = default);
        Task<GetLocationDto> CreateLocationAsync(CreateLocationDto dto, CancellationToken ct = default);
        Task<bool> UpdateLocationAsync(int id, UpdateLocationDto dto, CancellationToken ct = default);
        Task<bool> DeactivateLocationAsync(int id, CancellationToken ct = default);
        Task<bool> ActivateLocationAsync(int id, CancellationToken ct = default);
        Task<bool> DeleteLocationAsync(int id, CancellationToken ct = default);
        Task<bool> LocationExistsAsync(string zone, string col, string shelf, CancellationToken ct = default);
    }

    public class LocationService : ILocationService
    {
        private readonly AppDbContext _db;
        public LocationService(AppDbContext db) => _db = db;

        // --- GET ALL LOCATIONS ---
        public async Task<PagedResult<GetLocationDto>> GetAllLocationsAsync(PaginationParams pagination, string? searchQuery = null, string? zoneFilter = null, string? orderBy = null, string? sortDirection = null, CancellationToken ct = default)
        {
            var query = _db.Locations
                .AsNoTracking()
                .Include(l => l.Products)
                .AsQueryable();

            // Apply search filter (location code)
            if (!string.IsNullOrWhiteSpace(searchQuery))
            {
                var term = searchQuery.Trim().ToLower();
                query = query.Where(l => l.LocationCode.ToLower().Contains(term));
            }

            // Apply zone filter
            if (!string.IsNullOrWhiteSpace(zoneFilter))
            {
                var zone = zoneFilter.Trim().ToUpper();
                query = query.Where(l => l.Zone == zone);
            }

            // Apply sorting
            if (!string.IsNullOrWhiteSpace(orderBy))
            {
                var isDescending = sortDirection?.ToLower() == "desc";
                query = orderBy.ToLower() switch
                {
                    "code" or "locationcode" => isDescending
                        ? query.OrderByDescending(l => l.LocationCode)
                        : query.OrderBy(l => l.LocationCode),
                    "zone" => isDescending
                        ? query.OrderByDescending(l => l.Zone)
                        : query.OrderBy(l => l.Zone),
                    "col" or "column" => isDescending
                        ? query.OrderByDescending(l => l.Col)
                        : query.OrderBy(l => l.Col),
                    "shelf" => isDescending
                        ? query.OrderByDescending(l => l.Shelf)
                        : query.OrderBy(l => l.Shelf),
                    "productcount" => isDescending
                        ? query.OrderByDescending(l => l.Products.Count)
                        : query.OrderBy(l => l.Products.Count),
                    "totalquantity" => isDescending
                        ? query.OrderByDescending(l => l.Products.Sum(p => p.Quantity))
                        : query.OrderBy(l => l.Products.Sum(p => p.Quantity)),
                    _ => query.OrderBy(l => l.LocationCode)
                };
            }
            else
            {
                query = query.OrderBy(l => l.LocationCode);
            }

            var totalCount = await query.CountAsync(ct);

            var locations = await query
                .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync(ct);

            var items = locations.Select(l => MapToDto(l)).ToList();

            return new PagedResult<GetLocationDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize
            };
        }

        // --- GET LOCATION BY ID ---
        public async Task<GetLocationDto?> GetLocationByIdAsync(int id, CancellationToken ct = default)
        {
            var location = await _db.Locations
                .AsNoTracking()
                .Include(l => l.Products)
                .FirstOrDefaultAsync(l => l.Id == id, ct);

            return location == null ? null : MapToDto(location);
        }

        // --- CREATE LOCATION ---
        public async Task<GetLocationDto> CreateLocationAsync(CreateLocationDto dto, CancellationToken ct = default)
        {
            // Validate field lengths
            if (dto.Zone.Length != 4)
                throw new ArgumentException("Zone must be exactly 4 characters.");
            if (dto.Col.Length != 4)
                throw new ArgumentException("Col must be exactly 4 characters.");
            if (dto.Shelf.Length != 4)
                throw new ArgumentException("Shelf must be exactly 4 characters.");

            // Generate location code
            var locationCode = $"{dto.Zone}-{dto.Col}-{dto.Shelf}";

            // Check if location code already exists
            if (await _db.Locations.AnyAsync(l => l.LocationCode == locationCode, ct))
                throw new InvalidOperationException($"Location with code {locationCode} already exists.");

            var location = new Location
            {
                Zone = dto.Zone.ToUpper(),
                Col = dto.Col.ToUpper(),
                Shelf = dto.Shelf.ToUpper(),
                LocationCode = locationCode.ToUpper(),
                IsActive = true
            };

            _db.Locations.Add(location);
            await _db.SaveChangesAsync(ct);

            // Reload with includes for proper DTO mapping
            var created = await _db.Locations
                .AsNoTracking()
                .Include(l => l.Products)
                .FirstAsync(l => l.Id == location.Id, ct);

            return MapToDto(created);
        }

        // --- UPDATE LOCATION ---
        public async Task<bool> UpdateLocationAsync(int id, UpdateLocationDto dto, CancellationToken ct = default)
        {
            var location = await _db.Locations.FindAsync(new object[] { id }, ct);
            if (location == null)
                return false;

            // Validate field lengths
            if (dto.Zone.Length != 4)
                throw new ArgumentException("Zone must be exactly 4 characters.");
            if (dto.Col.Length != 4)
                throw new ArgumentException("Col must be exactly 4 characters.");
            if (dto.Shelf.Length != 4)
                throw new ArgumentException("Shelf must be exactly 4 characters.");

            // Generate new location code
            var newLocationCode = $"{dto.Zone}-{dto.Col}-{dto.Shelf}".ToUpper();

            // Check if new location code conflicts with another location
            if (newLocationCode != location.LocationCode &&
                await _db.Locations.AnyAsync(l => l.LocationCode == newLocationCode && l.Id != id, ct))
            {
                throw new InvalidOperationException($"Location with code {newLocationCode} already exists.");
            }

            location.Zone = dto.Zone.ToUpper();
            location.Col = dto.Col.ToUpper();
            location.Shelf = dto.Shelf.ToUpper();
            location.LocationCode = newLocationCode;

            _db.Locations.Update(location);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DEACTIVATE LOCATION ---
        public async Task<bool> DeactivateLocationAsync(int id, CancellationToken ct = default)
        {
            var location = await _db.Locations.FindAsync(new object[] { id }, ct);
            if (location == null)
                return false;

            location.IsActive = false;
            _db.Locations.Update(location);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- ACTIVATE LOCATION ---
        public async Task<bool> ActivateLocationAsync(int id, CancellationToken ct = default)
        {
            var location = await _db.Locations.FindAsync(new object[] { id }, ct);
            if (location == null)
                return false;

            location.IsActive = true;
            _db.Locations.Update(location);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DELETE LOCATION ---
        public async Task<bool> DeleteLocationAsync(int id, CancellationToken ct = default)
        {
            var location = await _db.Locations
                .Include(l => l.Products)
                .FirstOrDefaultAsync(l => l.Id == id, ct);

            if (location == null)
                return false;

            // Check if location has products
            if (location.Products.Any())
                throw new InvalidOperationException("Cannot delete location with assigned products. Remove all products first.");

            _db.Locations.Remove(location);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- CHECK IF LOCATION EXISTS ---
        public async Task<bool> LocationExistsAsync(string zone, string col, string shelf, CancellationToken ct = default)
        {
            var locationCode = $"{zone}-{col}-{shelf}".ToUpper();
            return await _db.Locations.AnyAsync(l => l.LocationCode == locationCode, ct);
        }

        // --- HELPER: Map Location to GetLocationDto ---
        private static GetLocationDto MapToDto(Location location)
        {
            return new GetLocationDto
            {
                Id = location.Id,
                LocationCode = location.LocationCode,
                Zone = location.Zone,
                Col = location.Col,
                Shelf = location.Shelf,
                ProductCount = location.Products.Count,
                TotalQuantity = location.Products.Sum(p => p.Quantity),
                IsActive = location.IsActive
            };
        }
    }
}
