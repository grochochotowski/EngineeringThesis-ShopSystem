using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using BackendTest.TestHelpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Threading.Tasks;
using Xunit;
using Microsoft.Extensions.Configuration;
using Backend.Api.Objects.Entities.Enums; // Required for IConfiguration

namespace BackendTest.Services
{
    public class AuthServiceTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;
        private readonly IConfiguration _configuration;

        public AuthServiceTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
            // Mock IConfiguration if needed, or create a minimal one for testing
            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string>
                {
                    {"Jwt:Key", "this_is_a_test_key_with_more_than_sixty_four_bytes_length_for_hmac_sha512_token_signing_1234567890"},
                    {"Jwt:Issuer", "TestIssuer"},
                    {"Jwt:Audience", "TestAudience"},
                    {"Jwt:AccessExpireMinutes", "60"},
                    {"Jwt:RefreshExpireDays", "14"}
                })
                .Build();
        }

        private AuthService CreateService(AppDbContext context)
        {
            return new AuthService(context, _configuration);
        }

        #region Login Tests

        [Fact]
        public async Task Login_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);

            var address = new Address
            {
                Country = Country.Poland,
                City = "Test City",
                PostalCode = "00-001",
                Street = "Auth St 1",
                Building = "1"
            };
            context.Addresses.Add(address);

            var user = new User
            {
                FirstName = "Test",
                LastName = "User",
                Email = "test@example.com",
                PhoneNumber = "123456789",
                DateOfBirth = DateTime.UtcNow.AddYears(-25),
                Role = UserRole.ShopAssistant,
                Address = address
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            // Manually hash password for the test user
            var password = "password123";
            CreatePasswordHash(password, out var hash, out var salt);

            var credentials = new UserCredential
            {
                UserId = user.Id,
                Login = "testuser",
                PasswordHash = Convert.ToBase64String(hash),
                PasswordSalt = Convert.ToBase64String(salt),
                IsActive = true
            };
            context.UserCredentials.Add(credentials);
            await context.SaveChangesAsync();

            var loginDto = new LoginDto
            {
                Login = "testuser",
                Password = "password123"
            };

            // Act
            var result = await service.LoginAsync(loginDto);

            // Assert
            result.Should().NotBeNull();
            result.Email.Should().Be("test@example.com");
            result.AccessToken.Should().NotBeNullOrEmpty();
            result.RefreshToken.Should().NotBeNullOrEmpty();
        }

        [Fact]
        public async Task Login_InvalidPassword_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);

            var address = new Address
            {
                Country = Country.Poland,
                City = "Test City",
                PostalCode = "00-002",
                Street = "Auth St 2",
                Building = "2"
            };
            context.Addresses.Add(address);

            var user = new User
            {
                FirstName = "Test",
                LastName = "User",
                Email = "test2@example.com",
                PhoneNumber = "987654321",
                DateOfBirth = DateTime.UtcNow.AddYears(-25),
                Role = UserRole.ShopAssistant,
                Address = address
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            // Manually hash password for the test user
            var password = "password123";
            CreatePasswordHash(password, out var hash, out var salt);

            var credentials = new UserCredential
            {
                UserId = user.Id,
                Login = "testuser2",
                PasswordHash = Convert.ToBase64String(hash),
                PasswordSalt = Convert.ToBase64String(salt),
                IsActive = true
            };
            context.UserCredentials.Add(credentials);
            await context.SaveChangesAsync();

            var loginDto = new LoginDto
            {
                Login = "testuser2",
                Password = "wrongpassword"
            };

            // Act
            var result = await service.LoginAsync(loginDto);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task Login_InvalidLogin_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);

            var loginDto = new LoginDto
            {
                Login = "nonexistentuser",
                Password = "anypassword"
            };

            // Act
            var result = await service.LoginAsync(loginDto);

            // Assert
            result.Should().BeNull();
        }

        #endregion

        // Helper method from AuthService to create password hash for test setup
        private static void CreatePasswordHash(string password, out byte[] hash, out byte[] salt)
        {
            using var hmac = new System.Security.Cryptography.HMACSHA512();
            salt = hmac.Key;
            hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
        }
    }
}
