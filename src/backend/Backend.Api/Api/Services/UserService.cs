using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    public interface IUsersService
    {
        Task<GetUserDto> CreateAsync(CreateUserDto dto, CancellationToken ct = default);
        Task<GetUserDto?> GetByIdAsync(int id, CancellationToken ct = default);

        Task<IReadOnlyList<GetUserDto>> GetAllAsync(
            string? q = null,
            UserRole? role = null,
            DateTime? dobFrom = null,
            DateTime? dobTo = null,
            CancellationToken ct = default);

        Task<bool> UpdateAsync(int id, UpdateUserDto dto, CancellationToken ct = default);
        Task<bool> UpdateLoginAndPasswordAsync(int id, UpdateUserPasswordOrLoginDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    }

    public class UsersService : IUsersService
    {
        private readonly AppDbContext _db;
        private readonly IAddressService _addressService;

        public UsersService(AppDbContext db, IAddressService addressService)
        {
            _db = db;
            _addressService = addressService;
        }

        public async Task<GetUserDto> CreateAsync(CreateUserDto dto, CancellationToken ct = default)
        {
            if (await _db.Users.AnyAsync(u => u.Login == dto.Login, ct))
                throw new InvalidOperationException("Login already in use.");
            if (await _db.Users.AnyAsync(u => u.Email == dto.Email, ct))
                throw new InvalidOperationException("Email already in use.");

            int addressId;
            if (dto.AddressId.HasValue)
            {
                var exists = await _db.Addresses.AnyAsync(a => a.Id == dto.AddressId.Value, ct);
                if (!exists) throw new InvalidOperationException("Address not found.");
                addressId = dto.AddressId.Value;
            }
            else if (dto.Address is not null)
            {
                var createdAddress = await _addressService.CreateAsync(dto.Address, ct);
                addressId = createdAddress.Id;
            }
            else
            {
                throw new InvalidOperationException("Provide AddressId or Address.");
            }

            var entity = new User
            {
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = dto.Email.Trim(),
                PhoneNumber = dto.PhoneNumber?.Trim(),
                DateOfBirth = dto.DateOfBirth,
                Role = dto.Role,
                Login = dto.Login.Trim(),
                Password = dto.Password, // TODO: Password hashing
                AddressId = addressId
            };

            _db.Users.Add(entity);
            await _db.SaveChangesAsync(ct);
            return ToGetDto(entity);
        }

        public async Task<GetUserDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return u is null ? null : ToGetDto(u);
        }

        public async Task<IReadOnlyList<GetUserDto>> GetAllAsync(
            string? q = null,
            UserRole? role = null,
            DateTime? dobFrom = null,
            DateTime? dobTo = null,
            CancellationToken ct = default)
        {
            var qry = _db.Users.AsNoTracking().Include(u => u.Address).AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                qry = qry.Where(u =>
                    u.FirstName.Contains(term) ||
                    u.LastName.Contains(term) ||
                    u.Email.Contains(term) ||
                    u.PhoneNumber.Contains(term) ||
                    u.Login.Contains(term));
            }

            if (role.HasValue)
                qry = qry.Where(u => u.Role == role.Value);

            if (dobFrom.HasValue) qry = qry.Where(u => u.DateOfBirth >= dobFrom.Value);
            if (dobTo.HasValue) qry = qry.Where(u => u.DateOfBirth <= dobTo.Value);

            return await qry
                .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
                .Select(u => new GetUserDto
                {
                    Id = u.Id,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Email = u.Email,
                    PhoneNumber = u.PhoneNumber,
                    DateOfBirth = u.DateOfBirth,
                    Role = u.Role,
                    Login = u.Login,
                    AddressId = u.AddressId
                })
                .ToListAsync(ct);
        }

        public async Task<bool> UpdateAsync(int id, UpdateUserDto dto, CancellationToken ct = default)
        {
            var entity = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
            if (entity is null) return false;

            if (!string.Equals(entity.Email, dto.Email, StringComparison.Ordinal))
            {
                var taken = await _db.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id, ct);
                if (taken) throw new InvalidOperationException("Email already in use.");
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
            entity.Role = dto.Role;           // <- enum-safe
            entity.AddressId = dto.AddressId;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> UpdateLoginAndPasswordAsync(int id, UpdateUserPasswordOrLoginDto dto, CancellationToken ct = default)
        {
            var entity = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
            if (entity is null) return false;

            if (!string.Equals(entity.Login, dto.Login, StringComparison.Ordinal))
            {
                var loginTaken = await _db.Users.AnyAsync(u => u.Login == dto.Login && u.Id != id, ct);
                if (loginTaken) throw new InvalidOperationException("Login already in use.");
            }

            entity.Login = dto.Login;
            entity.Password = dto.Password; // TODO: hash
            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
            if (entity is null) return false;

            _db.Users.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        private static GetUserDto ToGetDto(User u) => new()
        {
            Id = u.Id,
            FirstName = u.FirstName,
            LastName = u.LastName,
            Email = u.Email,
            PhoneNumber = u.PhoneNumber,
            DateOfBirth = u.DateOfBirth,
            Role = u.Role,
            Login = u.Login,
            AddressId = u.AddressId//
        };
    }
}