using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    public interface IUsersService
    {
        Task<GetUserDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PagedResult<GetUserDto>> GetAllAsync(
            PaginationParams pagination,
            string? search = null,
            UserRole? role = null,
            bool? isActive = null,
            string? orderBy = null,
            string? sortDirection = null,
            CancellationToken ct = default);
        Task<bool> UpdateAsync(int id, UpdateUserDto dto, CancellationToken ct = default);
        Task<bool> DeactivateAsync(int id, CancellationToken ct = default);
        Task<bool> ActivateAsync(int id, CancellationToken ct = default);
    }

    public class UserService : IUsersService
    {
        private readonly AppDbContext _db;
        private readonly IAddressService _addressService;

        public UserService(AppDbContext db, IAddressService addressService)
        {
            _db = db;
            _addressService = addressService;
        }

        // --- GET USER BY ID ---
        public async Task<GetUserDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            return await _db.Users
                .AsNoTracking()
                .Include(u => u.Credentials)
                .Select(u => new GetUserDto
                {
                    Id = u.Id,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Login = u.Credentials.Login,
                    Email = u.Email,
                    PhoneNumber = u.PhoneNumber,
                    DateOfBirth = u.DateOfBirth,
                    Role = u.Role,
                    AddressId = u.AddressId,
                    IsActive = u.Credentials.IsActive
                })
                .FirstOrDefaultAsync(x => x.Id == id, ct);
        }

        // --- GET ALL USERS (paginated and filtered) ---
        public async Task<PagedResult<GetUserDto>> GetAllAsync(
            PaginationParams pagination,
            string? search = null,
            UserRole? role = null,
            bool? isActive = null,
            string? orderBy = null,
            string? sortDirection = null,
            CancellationToken ct = default)
        {
            var query = _db.Users
                .AsNoTracking()
                .Include(u => u.Credentials)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalized = search.Trim().ToLower();
                query = query.Where(u =>
                    u.FirstName.ToLower().Contains(normalized) ||
                    u.LastName.ToLower().Contains(normalized) ||
                    u.Email.ToLower().Contains(normalized) ||
                    (u.PhoneNumber ?? "").ToLower().Contains(normalized));
            }

            if (role.HasValue)
                query = query.Where(u => u.Role == role.Value);

            if (isActive.HasValue)
                query = query.Where(u => u.Credentials.IsActive == isActive.Value);

            var direction = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase) ? "desc" : "asc";
            var ord = (orderBy ?? "lastName").ToLower();

            query = ord switch
            {
                "firstname" => direction == "desc"
                    ? query.OrderByDescending(u => u.FirstName).ThenByDescending(u => u.LastName)
                    : query.OrderBy(u => u.FirstName).ThenBy(u => u.LastName),
                "email" => direction == "desc"
                    ? query.OrderByDescending(u => u.Email)
                    : query.OrderBy(u => u.Email),
                "role" => direction == "desc"
                    ? query.OrderByDescending(u => u.Role)
                    : query.OrderBy(u => u.Role),
                "isactive" => direction == "desc"
                    ? query.OrderByDescending(u => u.Credentials.IsActive)
                    : query.OrderBy(u => u.Credentials.IsActive),
                _ => direction == "desc"
                    ? query.OrderByDescending(u => u.LastName).ThenByDescending(u => u.FirstName)
                    : query.OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
            };

            var mapped = query.Select(u => new GetUserDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Login = u.Credentials.Login,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                DateOfBirth = u.DateOfBirth,
                Role = u.Role,
                AddressId = u.AddressId,
                IsActive = u.Credentials.IsActive
            });

            return await mapped.ToPagedResultAsync(pagination.PageNumber, pagination.PageSize, ct);
        }

        // --- UPDATE USER ---
        public async Task<bool> UpdateAsync(int id, UpdateUserDto dto, CancellationToken ct = default)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
            if (user is null) return false;

            if (!string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            {
                var taken = await _db.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id, ct);
                if (taken)
                    throw new InvalidOperationException("Email already in use.");
            }

            if (dto.AddressId.HasValue)
            {
                var exists = await _db.Addresses.AnyAsync(a => a.Id == dto.AddressId.Value, ct);
                if (!exists)
                    throw new InvalidOperationException("Address not found.");
                user.AddressId = dto.AddressId.Value;
            }
            else if (dto.Address is not null)
            {
                var newAddr = await _addressService.CreateAsync(dto.Address, ct);
                user.AddressId = newAddr.Id;
            }

            user.FirstName = dto.FirstName.Trim();
            user.LastName = dto.LastName.Trim();
            user.Email = dto.Email.Trim();
            user.PhoneNumber = dto.PhoneNumber?.Trim();
            user.DateOfBirth = dto.DateOfBirth;
            user.Role = dto.Role;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- DEACTIVATE USER ---
        public async Task<bool> DeactivateAsync(int id, CancellationToken ct = default)
        {
            var credentials = await _db.UserCredentials
                .FirstOrDefaultAsync(c => c.UserId == id, ct);

            if (credentials is null)
                return false;

            if (!credentials.IsActive)
                throw new InvalidOperationException("User account is already deactivated.");

            credentials.IsActive = false;
            credentials.LockedUntil = null;
            await _db.SaveChangesAsync(ct);

            return true;
        }

        // --- ACTIVATE USER ---
        public async Task<bool> ActivateAsync(int id, CancellationToken ct = default)
        {
            var credentials = await _db.UserCredentials
                .FirstOrDefaultAsync(c => c.UserId == id, ct);

            if (credentials is null)
                return false;

            if (credentials.IsActive)
                throw new InvalidOperationException("User account is already active.");

            credentials.IsActive = true;
            credentials.LockedUntil = null;
            credentials.FailedAttempts = 0;
            await _db.SaveChangesAsync(ct);

            return true;
        }
    }
}
