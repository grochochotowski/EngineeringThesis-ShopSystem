using Backend.Api.Objects.Entities.Enums;
using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using BackendTest.TestHelpers;
using FluentAssertions;
using System;
using System.Threading.Tasks;
using Xunit;

namespace BackendTest.Services
{
    public class EventsServiceTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public EventsServiceTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        private EventsService CreateService(AppDbContext context)
        {
            return new EventsService(context);
        }

        #region Add/Edit Event Tests

        [Fact]
        public async Task CreateEvent_WithAllRequiredFields_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var address = new Address { Street = "Test Street 16", City = "Test City", PostalCode = "12345", Country = Country.Poland, Building = "1", Premises = "1" };
            var user = new User { FirstName="test", LastName="user", Email = "event.user@test.com", PhoneNumber = "111222333", DateOfBirth = DateTime.UtcNow.AddYears(-25), Address = address };
            context.Addresses.Add(address);
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var dto = new CreateEventDto
            {
                Title = "Test Event",
                Description = "Test Description",
                DateOfEvent = DateTime.UtcNow.AddDays(7),
                AddressId = address.Id,
                CreatedByUserId = user.Id
            };

            // Act
            var result = await service.CreateAsync(dto, CancellationToken.None);

            // Assert
            result.Should().NotBeNull();
            result.Title.Should().Be("Test Event");
        }

        [Fact]
        public void CreateEvent_WithoutTitle_Error()
        {
            // Arrange
            var dto = new CreateEventDto
            {
                Description = "Test Description",
                DateOfEvent = DateTime.UtcNow.AddDays(7),
                CreatedByUserId = 1
            };

            // Act & Assert
            var validationContext = new System.ComponentModel.DataAnnotations.ValidationContext(dto, null, null);
            var validationResults = new System.Collections.Generic.List<System.ComponentModel.DataAnnotations.ValidationResult>();
            var isValid = System.ComponentModel.DataAnnotations.Validator.TryValidateObject(dto, validationContext, validationResults, true);
            isValid.Should().BeFalse();
            validationResults.Should().Contain(v => v.MemberNames.Contains("Title"));
        }

        #endregion

        #region Publish Event Tests

        [Fact]
        public async Task PublishEvent_WithoutImage_Error()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var userAddress = new Address { Street = "Publish User St 1", City = "City", PostalCode = "00-010", Country = Country.Poland };
            var user = new User { FirstName = "test", LastName = "user", Email = "event.publisher@test.com", PhoneNumber = "111222444", DateOfBirth = DateTime.UtcNow.AddYears(-25), Address = userAddress };
            context.Addresses.Add(userAddress);
            context.Users.Add(user);

            var newEvent = new Event
            {
                Title = "Test Event",
                Description = "Test Description",
                DateOfEvent = DateTime.UtcNow.AddDays(7),
                Status = EventStatus.Created,
                Address = new Address { Street = "Publish St 1", City = "City", PostalCode = "00-001", Country = Country.Poland },
                CreatedByUserId = user.Id
            };
            context.Events.Add(newEvent);
            await context.SaveChangesAsync();

            // Act
            var result = await service.PublishAsync(newEvent.Id, CancellationToken.None);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public async Task PublishEvent_WithImage_Success()
        {
            // Arrange
            using var context = _fixture.CreateContext();
            var service = CreateService(context);
            var userAddress = new Address { Street = "Publish User St 2", City = "City", PostalCode = "00-020", Country = Country.Poland };
            var user = new User { FirstName = "test", LastName = "user", Email = "event.publisher2@test.com", PhoneNumber = "111222555", DateOfBirth = DateTime.UtcNow.AddYears(-25), Address = userAddress };
            context.Addresses.Add(userAddress);
            context.Users.Add(user);

            var newEvent = new Event
            {
                Title = "Test Event",
                Description = "Test Description",
                DateOfEvent = DateTime.UtcNow.AddDays(7),
                Status = EventStatus.Created,
                Address = new Address { Street = "Publish St 2", City = "City", PostalCode = "00-002", Country = Country.Poland },
                Image = new byte[] { 1, 2, 3 },
                CreatedByUserId = user.Id
            };
            context.Events.Add(newEvent);
            await context.SaveChangesAsync();

            // Act
            var result = await service.PublishAsync(newEvent.Id, CancellationToken.None);

            // Assert
            result.Should().BeTrue();
            var publishedEvent = await context.Events.FindAsync(newEvent.Id);
            publishedEvent.Status.Should().Be(EventStatus.Published);
        }

        #endregion
    }
}
