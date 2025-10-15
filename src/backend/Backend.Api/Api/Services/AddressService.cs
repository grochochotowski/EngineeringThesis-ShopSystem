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
        Task<IReadOnlyList<GetAddressDto>> GetAllAsync(CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateAddressDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    }

    public class AddressService : IAddressService
    {
        private readonly AppDbContext _db;
        public AddressService(AppDbContext db) => _db = db;

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

        public async Task<GetAddressDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Addresses.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, ct);
            return entity is null ? null : ToGetDto(entity);
        }

        public async Task<IReadOnlyList<GetAddressDto>> GetAllAsync(CancellationToken ct = default)
        {
            var list = await _db.Addresses
                .AsNoTracking()
                .OrderBy(a => a.City).ThenBy(a => a.Street).ThenBy(a => a.Building)
                .ToListAsync(ct);

            return list.Select(ToGetDto).ToList();
        }

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

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Addresses.FirstOrDefaultAsync(a => a.Id == id, ct);
            if (entity is null) return false;


            _db.Addresses.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return true;
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
