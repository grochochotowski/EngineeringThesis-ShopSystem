using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Api.Api.Services
{
    public interface IAuthService
    {
        Task<AuthUserDto> RegisterAsync(RegisterUserDto dto, CancellationToken ct = default);
        Task<AuthUserDto?> LoginAsync(LoginDto dto, CancellationToken ct = default);
        Task<AuthUserDto?> RefreshTokenAsync(RefreshTokenDto dto, CancellationToken ct = default);
        Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto dto, CancellationToken ct = default);
    }

    public class AuthService : IAuthService
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public AuthService(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        // --- REGISTER ---
        public async Task<AuthUserDto> RegisterAsync(RegisterUserDto dto, CancellationToken ct = default)
        {
            // Check for duplicates
            if (await _db.UserCredentials.AnyAsync(u => u.Login == dto.Login, ct))
                throw new InvalidOperationException("Login already exists.");
            if (await _db.Users.AnyAsync(u => u.Email == dto.Email, ct))
                throw new InvalidOperationException("Email already exists.");

            // Hash password
            CreatePasswordHash(dto.Password, out var hash, out var salt);

            // Create user
            var user = new User
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                DateOfBirth = dto.DateOfBirth,
                Role = dto.Role
            };

            // Address handling
            if (dto.AddressId.HasValue)
            {
                user.AddressId = dto.AddressId.Value;
            }
            else if (dto.Address is not null)
            {
                var addr = new Address
                {
                    Country = dto.Address.Country,
                    City = dto.Address.City,
                    PostalCode = dto.Address.PostalCode,
                    Street = dto.Address.Street,
                    Building = dto.Address.Building,
                    Premises = dto.Address.Premises
                };
                _db.Addresses.Add(addr);
                user.Address = addr;
            }

            // Credentials
            user.Credentials = new UserCredential
            {
                Login = dto.Login,
                PasswordHash = Convert.ToBase64String(hash),
                PasswordSalt = Convert.ToBase64String(salt),
                IsActive = true
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync(ct);

            // Create refresh token
            var refreshToken = GenerateRefreshToken();
            user.RefreshTokens.Add(refreshToken);
            await _db.SaveChangesAsync(ct);

            return new AuthUserDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Role = user.Role,
                AccessToken = GenerateAccessToken(user),
                RefreshToken = refreshToken.Token
            };
        }

        // --- LOGIN ---
        public async Task<AuthUserDto?> LoginAsync(LoginDto dto, CancellationToken ct = default)
        {
            var credentials = await _db.UserCredentials
                .Include(c => c.User)
                .ThenInclude(u => u.RefreshTokens)
                .FirstOrDefaultAsync(c => c.Login == dto.Login, ct);

            if (credentials == null || !VerifyPassword(dto.Password, credentials.PasswordHash, credentials.PasswordSalt))
                return null;

            var user = credentials.User;

            // Cleanup expired tokens
            user.RefreshTokens = user.RefreshTokens
                .Where(t => t.ExpiresAt > DateTimeOffset.UtcNow && !t.IsRevoked)
                .ToList();

            // Add new refresh token
            var refreshToken = GenerateRefreshToken();
            user.RefreshTokens.Add(refreshToken);

            await _db.SaveChangesAsync(ct);

            return new AuthUserDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Role = user.Role,
                AccessToken = GenerateAccessToken(user),
                RefreshToken = refreshToken.Token
            };
        }

        // --- REFRESH TOKEN ---
        public async Task<AuthUserDto?> RefreshTokenAsync(RefreshTokenDto dto, CancellationToken ct = default)
        {
            var tokenEntity = await _db.RefreshTokens
                .Include(t => t.User)
                .ThenInclude(u => u.Credentials)
                .FirstOrDefaultAsync(t => t.Token == dto.RefreshToken, ct);

            if (tokenEntity == null || tokenEntity.ExpiresAt <= DateTimeOffset.UtcNow || tokenEntity.IsRevoked)
                return null;

            var user = tokenEntity.User;

            // Mark old token as used
            tokenEntity.IsRevoked = true;

            // Generate new one
            var newToken = GenerateRefreshToken();
            user.RefreshTokens.Add(newToken);

            await _db.SaveChangesAsync(ct);

            return new AuthUserDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Role = user.Role,
                AccessToken = GenerateAccessToken(user),
                RefreshToken = newToken.Token
            };
        }

        // --- CHANGE PASSWORD ---
        public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto dto, CancellationToken ct = default)
        {
            var credentials = await _db.UserCredentials.FirstOrDefaultAsync(u => u.UserId == userId, ct);
            if (credentials == null) return false;

            if (!VerifyPassword(dto.CurrentPassword, credentials.PasswordHash, credentials.PasswordSalt))
                return false;

            CreatePasswordHash(dto.NewPassword, out var newHash, out var newSalt);
            credentials.PasswordHash = Convert.ToBase64String(newHash);
            credentials.PasswordSalt = Convert.ToBase64String(newSalt);
            credentials.PasswordUpdatedAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        // --- HELPERS ---

        private static void CreatePasswordHash(string password, out byte[] hash, out byte[] salt)
        {
            using var hmac = new HMACSHA512();
            salt = hmac.Key;
            hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        }

        private static bool VerifyPassword(string password, string hashBase64, string saltBase64)
        {
            var storedHash = Convert.FromBase64String(hashBase64);
            var storedSalt = Convert.FromBase64String(saltBase64);

            using var hmac = new HMACSHA512(storedSalt);
            var computed = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
            return CryptographicOperations.FixedTimeEquals(computed, storedHash);
        }

        private string GenerateAccessToken(User user)
        {
            var jwt = _config.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: jwt["Issuer"],
                audience: jwt["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(jwt.GetValue<int>("AccessExpireMinutes")),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private RefreshToken GenerateRefreshToken()
        {
            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            return new RefreshToken
            {
                Token = token,
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(_config.GetValue<int>("Jwt:RefreshExpireDays")),
                IsRevoked = false
            };
        }
    }
}
