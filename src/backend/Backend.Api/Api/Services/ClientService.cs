using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    public interface IClientService
    {
        Task<GetClientDto> CreateAsync(CreateClientDto dto, CancellationToken ct = default);
        Task<GetClientDto> CreateWithAddressAsync(CreateClientWithAddressDto dto, CancellationToken ct = default);

        Task<GetClientDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<IReadOnlyList<GetClientDto>> GetAllAsync(
        string? q = null,
        ClientType? type = null,
        string? city = null,
        DateTime? dobFrom = null,
        DateTime? dobTo = null,
        CancellationToken ct = default);

        Task<bool> UpdateAsync(int id, UpdateClientDto dto, CancellationToken ct = default);
        Task<bool> UpdateAddressFieldsAsync(int id, UpdateAddressDto dto, CancellationToken ct = default);

        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    }

    public class ClientService : IClientService
    {
        private readonly AppDbContext _db;
        public ClientService(AppDbContext db) => _db = db;

        public async Task<GetClientDto> CreateAsync(CreateClientDto dto, CancellationToken ct = default)
        {
            var emailTaken = await _db.Clients.AnyAsync(c => c.Email == dto.Email, ct);
            if (emailTaken) throw new InvalidOperationException("Client with this email already exists.");

            var addrExists = await _db.Addresses.AnyAsync(a => a.Id == dto.AddressId, ct);
            if (!addrExists) throw new InvalidOperationException("Address not found.");

            var entity = new Client
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                DateOfBirth = dto.DateOfBirth,
                Type = dto.Type,
                AddressId = dto.AddressId
            };

            _db.Clients.Add(entity);
            await _db.SaveChangesAsync(ct);

            return ToGetDto(entity);
        }

        public async Task<GetClientDto> CreateWithAddressAsync(CreateClientWithAddressDto dto, CancellationToken ct = default)
        {
            var emailTaken = await _db.Clients.AnyAsync(c => c.Email == dto.Email, ct);
            if (emailTaken) throw new InvalidOperationException("Client with this email already exists.");

            using var tx = await _db.Database.BeginTransactionAsync(ct);

            var addr = new Address
            {
                Country = dto.Address.Country,
                City = dto.Address.City,
                Street = dto.Address.Street,
                Building = dto.Address.Building,
                Premises = dto.Address.Premises,
                PostalCode = dto.Address.PostalCode
            };
            _db.Addresses.Add(addr);
            await _db.SaveChangesAsync(ct);

            var entity = new Client
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                DateOfBirth = dto.DateOfBirth,
                Type = dto.Type,
                AddressId = addr.Id
            };
            _db.Clients.Add(entity);
            await _db.SaveChangesAsync(ct);

            await tx.CommitAsync(ct);

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
            string? city = null,
            DateTime? dobFrom = null,
            DateTime? dobTo = null,
            CancellationToken ct = default)
        {
            var qry = _db.Clients
                .AsNoTracking()
                .Include(c => c.Address)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                qry = qry.Where(c =>
                    c.FirstName.Contains(term) ||
                    c.LastName.Contains(term) ||
                    c.Email.Contains(term) ||
                    c.PhoneNumber.Contains(term));
            }

            if (type.HasValue)
                qry = qry.Where(c => c.Type == type.Value);

            if (!string.IsNullOrWhiteSpace(city))
            {
                var cityTerm = city.Trim();
                qry = qry.Where(c => c.Address.City.Contains(cityTerm));
            }

            if (dobFrom.HasValue)
                qry = qry.Where(c => c.DateOfBirth >= dobFrom.Value);

            if (dobTo.HasValue)
                qry = qry.Where(c => c.DateOfBirth <= dobTo.Value);

            var list = await qry
                .OrderBy(c => c.LastName).ThenBy(c => c.FirstName)
                .Select(c => new GetClientDto
                {
                    Id = c.Id,
                    FirstName = c.FirstName,
                    LastName = c.LastName,
                    Email = c.Email,
                    PhoneNumber = c.PhoneNumber,
                    DateOfBirth = c.DateOfBirth,
                    Type = c.Type,
                    AddressId = c.AddressId
                })
                .ToListAsync(ct);

            return list;
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

            if (entity.AddressId != dto.AddressId)
            {
                var addrExists = await _db.Addresses.AnyAsync(a => a.Id == dto.AddressId, ct);
                if (!addrExists) throw new InvalidOperationException("Address not found.");
            }

            entity.FirstName = dto.FirstName;
            entity.LastName = dto.LastName;
            entity.Email = dto.Email;
            entity.PhoneNumber = dto.PhoneNumber;
            entity.DateOfBirth = dto.DateOfBirth;
            entity.Type = dto.Type;
            entity.AddressId = dto.AddressId;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> UpdateAddressFieldsAsync(int id, UpdateAddressDto dto, CancellationToken ct = default)
        {
            var client = await _db.Clients.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
            if (client is null) return false;

            var addr = await _db.Addresses.FirstOrDefaultAsync(a => a.Id == client.AddressId, ct);
            if (addr is null) return false;

            addr.Country = dto.Country;
            addr.City = dto.City;
            addr.Street = dto.Street;
            addr.Building = dto.Building;
            addr.Premises = dto.Premises;
            addr.PostalCode = dto.PostalCode;

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
            FirstName = c.FirstName,
            LastName = c.LastName,
            Email = c.Email,
            PhoneNumber = c.PhoneNumber,
            DateOfBirth = c.DateOfBirth,
            Type = c.Type,
            AddressId = c.AddressId
        };
    }
}