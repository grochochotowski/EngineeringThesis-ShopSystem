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
        Task<PagedResult<GetDeliveryCompanyDto>> GetAllAsync(string? q = null, bool? isActive = null, PaginationParams? pagination = null, CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateDeliveryCompanyDto dto, CancellationToken ct = default);
        Task<bool> DeactivateAsync(int id, CancellationToken ct = default);
        Task<bool> RestoreAsync(int id, CancellationToken ct = default);
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

        // --- CREATE DELIVERY COMPANY ---
        public async Task<GetDeliveryCompanyDto> CreateAsync(CreateDeliveryCompanyDto dto, CancellationToken ct = default)
        {
            // validate address and create or get existing
            if (dto.Address is null)
                throw new InvalidOperationException("Address is required.");

            int addressId = await _addressService.GetOrCreateAsync(dto.Address, ct);

            // create delivery company entity
            var entity = new DeliveryCompany
            {
                Name = dto.Name.Trim(),
                PhoneNumber = dto.PhoneNumber.Trim(),
                Email = dto.Email.Trim(),
                AddressId = addressId
            };

            _db.DeliveryCompanies.Add(entity);
            await _db.SaveChangesAsync(ct);

            var address = await _db.Addresses.FindAsync(new object?[] { addressId }, ct);
            return ToGetDto(entity, address!);
        }

        // --- GET DELIVERY COMPANY BY ID ---
        public async Task<GetDeliveryCompanyDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.DeliveryCompanies
                .Include(x => x.Address)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            return entity is null ? null : ToGetDto(entity, entity.Address);
        }

        // --- GET ALL (pagination and search) ---
        public async Task<PagedResult<GetDeliveryCompanyDto>> GetAllAsync(
            string? q = null,
            bool? isActive = null,
            PaginationParams? pagination = null,
            CancellationToken ct = default)
        {
            pagination ??= new PaginationParams();

            var query = _db.DeliveryCompanies
                .Include(x => x.Address)
                .AsNoTracking()
                .AsQueryable();

            // active status filter
            if (isActive.HasValue)
                query = query.Where(x => x.IsActive == isActive.Value);

            // search filter
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                query = query.Where(x =>
                    x.Name.ToLower().Contains(term) ||
                    x.Email.ToLower().Contains(term) ||
                    x.PhoneNumber.ToLower().Contains(term));
            }

            // projection
            var projected = query
                .OrderBy(x => x.Name)
                .Select(x => new GetDeliveryCompanyDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    PhoneNumber = x.PhoneNumber,
                    Email = x.Email,
                    Address = new GetAddressDto
                    {
                        Id = x.Address.Id,
                        Country = x.Address.Country.ToString(),
                        City = x.Address.City,
                        Street = x.Address.Street,
                        Building = x.Address.Building,
                        Premises = x.Address.Premises,
                        PostalCode = x.Address.PostalCode
                    },
                    IsActive = x.IsActive
                });

            return await projected.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }


        // --- UPDATE DELIVERY COMPANY ---
        public async Task<bool> UpdateAsync(int id, UpdateDeliveryCompanyDto dto, CancellationToken ct = default)
        {
            // find existing entity
            var entity = await _db.DeliveryCompanies.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return false;

            // validate address and create or get existing
            if (dto.Address is null)
                throw new InvalidOperationException("Address is required.");

            int addressId = await _addressService.GetOrCreateAsync(dto.Address, ct);
            entity.AddressId = addressId;

            // update fields
            entity.Name = dto.Name.Trim();
            entity.PhoneNumber = dto.PhoneNumber.Trim();
            entity.Email = dto.Email.Trim();

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DEACTIVATE DELIVERY COMPANY ---
        public async Task<bool> DeactivateAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.DeliveryCompanies.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return false;

            if (!entity.IsActive)
                throw new InvalidOperationException("This delivery company is already deactivated.");

            entity.IsActive = false;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- RESTORE DELIVERY COMPANY ---
        public async Task<bool> RestoreAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.DeliveryCompanies.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return false;

            if (entity.IsActive)
                throw new InvalidOperationException("This delivery company is already active.");

            entity.IsActive = true;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- MAPPER ---
        private static GetDeliveryCompanyDto ToGetDto(DeliveryCompany e, Address a) => new()
        {
            Id = e.Id,
            Name = e.Name,
            PhoneNumber = e.PhoneNumber,
            Email = e.Email,
            IsActive = e.IsActive,
            Address = new GetAddressDto
            {
                Id = a.Id,
                Country = a.Country.ToString(),
                City = a.City,
                Street = a.Street,
                Building = a.Building,
                Premises = a.Premises,
                PostalCode = a.PostalCode
            }
        };
    }
}