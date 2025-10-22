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
        Task<IReadOnlyList<GetClientDto>> GetAllAsync(
            string? q = null,
            ClientType? type = null,
            DateTime? dobFrom = null,
            DateTime? dobTo = null,
            CancellationToken ct = default);

        Task<bool> UpdateAsync(int id, UpdateClientDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
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

        public async Task<GetClientDto> CreateAsync(CreateClientDto dto, CancellationToken ct = default)
        {
            var emailTaken = await _db.Clients.AnyAsync(c => c.Email == dto.Email, ct);
            if (emailTaken) throw new InvalidOperationException("Client with this email already exists.");

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

            var entity = new Client
            {
                Name = dto.Name.Trim(),
                Email = dto.Email.Trim(),
                PhoneNumber = dto.PhoneNumber.Trim(),
                Type = dto.Type,
                AddressId = addressId
            };

            _db.Clients.Add(entity);
            await _db.SaveChangesAsync(ct);

            return ToGetDto(entity);
        }

        public async Task<GetClientDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var c = await _db.Clients.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return c is null ? null : ToGetDto(c);
        }

        public async Task<IReadOnlyList<GetClientDto>> GetAllAsync(
            string? q = null,
            ClientType? type = null,
            DateTime? dobFrom = null,
            DateTime? dobTo = null,
            CancellationToken ct = default)
        {
            var qry = _db.Clients.AsNoTracking().Include(c => c.Address).AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                qry = qry.Where(c =>
                    c.Name.Contains(term) ||
                    c.Email.Contains(term) ||
                    c.PhoneNumber.Contains(term));
            }

            if (type.HasValue) qry = qry.Where(c => c.Type == type.Value);

            return await qry
                .OrderBy(c => c.Name)
                .Select(c => new GetClientDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Email = c.Email,
                    PhoneNumber = c.PhoneNumber,
                    Type = c.Type,
                    AddressId = c.AddressId
                })
                .ToListAsync(ct);
        }

        public async Task<bool> UpdateAsync(int id, UpdateClientDto dto, CancellationToken ct = default)
        {
            var entity = await _db.Clients.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (entity is null) return false;

            if (!string.Equals(entity.Email, dto.Email, StringComparison.Ordinal))
            {
                var emailTaken = await _db.Clients.AnyAsync(c => c.Email == dto.Email && c.Id != id, ct);
                if (emailTaken) throw new InvalidOperationException("Client with this email already exists.");
            }

            if (dto.AddressId.HasValue)
            {
                var exists = await _db.Addresses.AnyAsync(a => a.Id == dto.AddressId.Value, ct);
                if (!exists) throw new InvalidOperationException("Address not found.");
                entity.AddressId = dto.AddressId.Value;
            }
            else if (dto.Address is not null)
            {
                var created = await _addressService.CreateAsync(dto.Address, ct);
                entity.AddressId = created.Id;
            }

            entity.Name = dto.Name.Trim();
            entity.Email = dto.Email.Trim();
            entity.PhoneNumber = dto.PhoneNumber.Trim();
            entity.Type = dto.Type;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Clients.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (entity is null) return false;

            _db.Clients.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        private static GetClientDto ToGetDto(Client c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Email = c.Email,
            PhoneNumber = c.PhoneNumber,
            Type = c.Type,
            AddressId = c.AddressId
        };
    }
}