using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Services
{
    public interface IAddressService
    {
        Task<GetAddressDto> CreateAsync(CreateAddressDto dto, CancellationToken ct = default);
        Task<GetAddressDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PagedResult<GetAddressDto>> GetAllAsync(PaginationParams pagination, CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateAddressDto dto, CancellationToken ct = default);
        Task<(bool exists, int? id)> AddressExistsAsync(AddressExistenceDto dto, CancellationToken ct = default);
    }

    public class AddressService : IAddressService
    {
        private readonly AppDbContext _db;
        public AddressService(AppDbContext db) => _db = db;

        // --- CREATE ADDRESS ---
        public async Task<GetAddressDto> CreateAsync(CreateAddressDto dto, CancellationToken ct = default)
        {
            var entity = new Address
            {
                Country = dto.Country,
                City = dto.City,
                Street = dto.Street,
                Building = dto.Building,
                Premises = dto.Premises,
                PostalCode = dto.PostalCode
            };

            _db.Addresses.Add(entity);
            await _db.SaveChangesAsync(ct);

            return ToGetDto(entity);
        }

        // --- GET ADDRESSES BY ID ---
        public async Task<GetAddressDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Addresses.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, ct);
            return entity is null ? null : ToGetDto(entity);
        }

        // --- GET ALL ADDRESSES (paginated) ---
        public async Task<PagedResult<GetAddressDto>> GetAllAsync(PaginationParams pagination, CancellationToken ct = default)
        {
            var query = _db.Addresses
                .AsNoTracking()
                .OrderBy(a => a.City)
                .ThenBy(a => a.Street)
                .Select(a => new GetAddressDto
                {
                    Id = a.Id,
                    Country = a.Country,
                    City = a.City,
                    Street = a.Street,
                    Building = a.Building,
                    Premises = a.Premises,
                    PostalCode = a.PostalCode
                });

            return await query.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        // --- UPDATE ADDRESS ---
        public async Task<bool> UpdateAsync(int id, UpdateAddressDto dto, CancellationToken ct = default)
        {
            var entity = await _db.Addresses.FirstOrDefaultAsync(a => a.Id == id, ct);
            if (entity is null) return false;

            entity.Country = dto.Country;
            entity.City = dto.City;
            entity.Street = dto.Street;
            entity.Building = dto.Building;
            entity.Premises = dto.Premises;
            entity.PostalCode = dto.PostalCode;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- ADDRESS EXISTENCE CHECK ---
        public async Task<(bool exists, int? id)> AddressExistsAsync(AddressExistenceDto dto, CancellationToken ct = default)
        {
            var country = dto.Country.Trim().ToLower();
            var city = dto.City.Trim().ToLower();
            var street = dto.Street.Trim().ToLower();
            var building = dto.Building.Trim().ToLower();
            var premises = (dto.Premises ?? string.Empty).Trim().ToLower();
            var postal = dto.PostalCode.Trim().ToLower();

            var hit = await _db.Addresses
                .Where(a =>
                    a.Country.ToLower() == country &&
                    a.City.ToLower() == city &&
                    a.Street.ToLower() == street &&
                    a.Building.ToLower() == building &&
                    (a.Premises ?? "").ToLower() == premises &&
                    a.PostalCode.ToLower() == postal)
                .Select(a => new { a.Id })
                .FirstOrDefaultAsync(ct);

            return (hit is not null, hit?.Id);
        }

        private static GetAddressDto ToGetDto(Address a) => new()
        {
            Id = a.Id,
            Country = a.Country,
            City = a.City,
            Street = a.Street,
            Building = a.Building,
            Premises = a.Premises,
            PostalCode = a.PostalCode
        };
    }
}
