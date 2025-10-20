using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    public interface IDeliveryCompaniesService
    {
        Task<GetDeliveryCompanyDto> CreateAsync(CreateDeliveryCompanyDto dto, CancellationToken ct = default);
        Task<GetDeliveryCompanyDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<IReadOnlyList<GetDeliveryCompanyDto>> GetAllAsync(string? q = null, int page = 1, int pageSize = 50, CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateDeliveryCompanyDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    }

    public sealed class DeliveryCompaniesService : IDeliveryCompaniesService
    {
        private readonly AppDbContext _db;
        private readonly IAddressService _addressService;

        public DeliveryCompaniesService(AppDbContext db, IAddressService addressService)
        {
            _db = db;
            _addressService = addressService;
        }

        public async Task<GetDeliveryCompanyDto> CreateAsync(CreateDeliveryCompanyDto dto, CancellationToken ct = default)
        {
            int addressId;
            if (dto.AddressId.HasValue)
            {
                var exists = await _db.Addresses.AnyAsync(a => a.Id == dto.AddressId.Value, ct);
                if (!exists) throw new InvalidOperationException("Address not found.");
                addressId = dto.AddressId.Value;
            }
            else if (dto.Address is not null)
            {
                var created = await _addressService.CreateAsync(dto.Address, ct);
                addressId = created.Id;
            }
            else
            {
                throw new InvalidOperationException("Provide AddressId or Address.");
            }

            var e = new DeliveryCompany
            {
                Name = dto.Name.Trim(),
                PhoneNumber = dto.PhoneNumber.Trim(),
                Email = dto.Email.Trim(),
                AddressId = addressId
            };

            _db.DeliveryCompanies.Add(e);
            await _db.SaveChangesAsync(ct);
            return ToGetDto(e);
        }

        public async Task<GetDeliveryCompanyDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.DeliveryCompanies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return e is null ? null : ToGetDto(e);
        }

        public async Task<IReadOnlyList<GetDeliveryCompanyDto>> GetAllAsync(string? q = null, int page = 1, int pageSize = 50, CancellationToken ct = default)
        {
            var qry = _db.DeliveryCompanies.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                qry = qry.Where(x =>
                    x.Name.Contains(term) ||
                    x.Email.Contains(term) ||
                    x.PhoneNumber.Contains(term));
            }

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 500);

            return await qry
                .OrderBy(x => x.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new GetDeliveryCompanyDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    PhoneNumber = e.PhoneNumber,
                    Email = e.Email,
                    AddressId = e.AddressId
                })
                .ToListAsync(ct);
        }

        public async Task<bool> UpdateAsync(int id, UpdateDeliveryCompanyDto dto, CancellationToken ct = default)
        {
            var e = await _db.DeliveryCompanies.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (e is null) return false;

            if (dto.AddressId.HasValue)
            {
                var exists = await _db.Addresses.AnyAsync(a => a.Id == dto.AddressId.Value, ct);
                if (!exists) throw new InvalidOperationException("Address not found.");
                e.AddressId = dto.AddressId.Value;
            }
            else if (dto.Address is not null)
            {
                var created = await _addressService.CreateAsync(dto.Address, ct);
                e.AddressId = created.Id;
            }

            e.Name = dto.Name.Trim();
            e.PhoneNumber = dto.PhoneNumber.Trim();
            e.Email = dto.Email.Trim();

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var e = await _db.DeliveryCompanies.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (e is null) return false;

            _db.DeliveryCompanies.Remove(e);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        private static GetDeliveryCompanyDto ToGetDto(DeliveryCompany e) => new()
        {
            Id = e.Id,
            Name = e.Name,
            PhoneNumber = e.PhoneNumber,
            Email = e.Email,
            AddressId = e.AddressId
        };
    }
}