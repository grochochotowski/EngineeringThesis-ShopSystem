using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    public interface IClientService
    {
        Task<GetClientDto> CreateAsync(CreateClientDto dto, CancellationToken ct = default);
        Task<GetClientDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PagedResult<GetClientDto>> GetAllAsync(string? q = null, ClientType? type = null, PaginationParams? pagination = null, CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateClientDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
        Task<bool> ActivateAsync(int id, CancellationToken ct = default);
    }
    public class ClientService : IClientService
    {
        private readonly AppDbContext _db;
        private readonly IAddressService _addressService;

        public ClientService(AppDbContext db, IAddressService addressService)
        {
            _db = db;
            _addressService = addressService;
        }

        // --- CREATE CLIENT ---
        public async Task<GetClientDto> CreateAsync(CreateClientDto dto, CancellationToken ct = default)
        {
            // checking if email is existing
            if (await _db.Clients.AnyAsync(c => c.Email == dto.Email, ct))
                throw new InvalidOperationException("Client with this email already exists.");

            // Validate TaxId for Company type
            if (dto.Type == ClientType.Company && string.IsNullOrWhiteSpace(dto.TaxId))
                throw new InvalidOperationException("Tax ID is required for Company type clients.");

            // checking if address was given and exists
            if (dto.Address is null)
                throw new InvalidOperationException("Address must be provided.");
            int addressId = await _addressService.GetOrCreateAsync(dto.Address, ct);

            // creating client
            var entity = new Client
            {
                Name = dto.Name.Trim(),
                Email = dto.Email.Trim(),
                PhoneNumber = dto.PhoneNumber.Trim(),
                Type = dto.Type,
                TaxId = dto.Type == ClientType.Company ? dto.TaxId?.Trim() : null,
                AddressId = addressId
            };

            _db.Clients.Add(entity);
            await _db.SaveChangesAsync(ct);

            return ToGetDto(await _db.Clients.Include(c => c.Address).FirstAsync(c => c.Id == entity.Id, ct));
        }

        // --- GET CLIENT BY ID ---
        public async Task<GetClientDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Clients
                .AsNoTracking()
                .Include(c => c.Address)
                .FirstOrDefaultAsync(c => c.Id == id, ct);

            return entity is null ? null : ToGetDto(entity);
        }

        // --- GET ALL CLIENTS (filters and pagination) ---
        public async Task<PagedResult<GetClientDto>> GetAllAsync(string? q = null, ClientType? type = null, PaginationParams? pagination = null, CancellationToken ct = default)
        {
            var query = _db.Clients
                .AsNoTracking()
                .Include(c => c.Address)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(term) ||
                    c.Email.ToLower().Contains(term) ||
                    c.PhoneNumber.ToLower().Contains(term));
            }

            if (type.HasValue)
                query = query.Where(c => c.Type == type.Value);

            var dtoQuery = query
                .OrderBy(c => c.Name)
                .Select(c => new GetClientDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Email = c.Email,
                    PhoneNumber = c.PhoneNumber,
                    Type = c.Type,
                    TaxId = c.TaxId,
                    IsActive = c.IsActive,
                    Address = c.Address != null ? new GetAddressDto
                    {
                        Id = c.Address.Id,
                        Country = c.Address.Country.ToString(),
                        City = c.Address.City,
                        Street = c.Address.Street,
                        Building = c.Address.Building,
                        Premises = c.Address.Premises,
                        PostalCode = c.Address.PostalCode
                    } : null
                });

            return await dtoQuery.ToPagedResultAsync(
                pagination?.PageNumber ?? 1,
                pagination?.PageSize ?? 10,
                ct);
        }

        // --- UPDATE CLIENT ---
        public async Task<bool> UpdateAsync(int id, UpdateClientDto dto, CancellationToken ct = default)
        {
            // fetching existing client
            var entity = await _db.Clients.Include(c => c.Address).FirstOrDefaultAsync(c => c.Id == id, ct);
            if (entity is null) return false;

            // checking if email is changing and if new email is existing
            if (!string.Equals(entity.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            {
                if (await _db.Clients.AnyAsync(c => c.Email == dto.Email && c.Id != id, ct))
                    throw new InvalidOperationException("Client with this email already exists.");
            }

            // Validate TaxId for Company type
            if (dto.Type == ClientType.Company && string.IsNullOrWhiteSpace(dto.TaxId))
                throw new InvalidOperationException("Tax ID is required for Company type clients.");

            // handling address update/creation
            int addressId = await _addressService.GetOrCreateAsync(dto.Address, ct);
            entity.AddressId = addressId;

            // updating client fields
            entity.Name = dto.Name.Trim();
            entity.Email = dto.Email.Trim();
            entity.PhoneNumber = dto.PhoneNumber.Trim();
            entity.Type = dto.Type;
            entity.TaxId = dto.Type == ClientType.Company ? dto.TaxId?.Trim() : null;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DELETE CLIENT (Soft delete - deactivate) ---
        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Clients.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (entity is null) return false;

            entity.IsActive = false;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- ACTIVATE CLIENT ---
        public async Task<bool> ActivateAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Clients.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (entity is null) return false;

            entity.IsActive = true;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DTO MAPPER ---
        private static GetClientDto ToGetDto(Client c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Email = c.Email,
            PhoneNumber = c.PhoneNumber,
            Type = c.Type,
            TaxId = c.TaxId,
            IsActive = c.IsActive,
            Address = c.Address != null ? new GetAddressDto
            {
                Id = c.Address.Id,
                Country = c.Address.Country.ToString(),
                City = c.Address.City,
                Street = c.Address.Street,
                Building = c.Address.Building,
                Premises = c.Address.Premises,
                PostalCode = c.Address.PostalCode
            } : null
        };
    }
}