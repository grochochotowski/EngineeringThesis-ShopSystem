using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using BackendTest.TestHelpers;
using FluentAssertions;

namespace BackendTest.Services
{
    public class LocationServiceTests : IClassFixture<DatabaseFixture>
    {
        private readonly DatabaseFixture _fixture;

        public LocationServiceTests(DatabaseFixture fixture)
        {
            _fixture = fixture;
        }

        #region Create Location

        [Fact]
        public async Task CreateLocation_WithValidCodes_Success()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto { Zone = "AAAA", Col = "0001", Shelf = "0101" };

            var result = await service.CreateLocationAsync(dto);

            result.Should().NotBeNull();
            result.LocationCode.Should().Be("AAAA-0001-0101");
            result.ProductCount.Should().Be(0);
            result.TotalQuantity.Should().Be(0);
        }

        [Fact]
        public async Task CreateLocation_TooShortZone_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto { Zone = "AAA", Col = "0001", Shelf = "0101" };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            ex.Message.Should().Contain("Zone must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_TooLongZone_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto { Zone = "AAAAA", Col = "0001", Shelf = "0101" };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            ex.Message.Should().Contain("Zone must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_TooShortCol_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto { Zone = "AAAA", Col = "001", Shelf = "0101" };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            ex.Message.Should().Contain("Col must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_TooLongCol_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto { Zone = "AAAA", Col = "00001", Shelf = "0101" };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            ex.Message.Should().Contain("Col must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_TooShortShelf_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto { Zone = "AAAA", Col = "0001", Shelf = "010" };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            ex.Message.Should().Contain("Shelf must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_TooLongShelf_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto { Zone = "AAAA", Col = "0001", Shelf = "01010" };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLocationAsync(dto));
            ex.Message.Should().Contain("Shelf must be exactly 4 characters");
        }

        [Fact]
        public async Task CreateLocation_DuplicateLocationCode_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var dto = new CreateLocationDto { Zone = "AAAA", Col = "0001", Shelf = "0101" };
            await service.CreateLocationAsync(dto);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateLocationAsync(dto));
            ex.Message.Should().Contain("already exists");
        }

        #endregion

        #region Edit Location

        [Fact]
        public async Task EditLocation_WithValidCodes_Success()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var created = await service.CreateLocationAsync(new CreateLocationDto { Zone = "AAAA", Col = "0001", Shelf = "0101" });
            var updateDto = new UpdateLocationDto { Zone = "BBBB", Col = "0002", Shelf = "0202" };

            var result = await service.UpdateLocationAsync(created.Id, updateDto);

            result.Should().BeTrue();
            var updated = await service.GetLocationByIdAsync(created.Id);
            updated!.LocationCode.Should().Be("BBBB-0002-0202");
        }

        [Fact]
        public async Task EditLocation_WithInvalidZone_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            var updateDto = new UpdateLocationDto { Zone = "BBB", Col = "0002", Shelf = "0202" };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateLocationAsync(location.Id, updateDto));
            ex.Message.Should().Contain("Zone must be exactly 4 characters");
        }

        [Fact]
        public async Task EditLocation_WithInvalidCol_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            var updateDto = new UpdateLocationDto { Zone = "BBBB", Col = "002", Shelf = "0202" };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateLocationAsync(location.Id, updateDto));
            ex.Message.Should().Contain("Col must be exactly 4 characters");
        }

        [Fact]
        public async Task EditLocation_WithInvalidShelf_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            var updateDto = new UpdateLocationDto { Zone = "BBBB", Col = "0002", Shelf = "202" };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateLocationAsync(location.Id, updateDto));
            ex.Message.Should().Contain("Shelf must be exactly 4 characters");
        }

        [Fact]
        public async Task EditLocation_ConflictingLocationCode_ThrowsException()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);
            var location1 = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            var location2 = TestDataSeeder.CreateTestLocation(context, "BBBB-0002-0202");

            var updateDto = new UpdateLocationDto { Zone = "AAAA", Col = "0001", Shelf = "0101" };

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateLocationAsync(location2.Id, updateDto));
            ex.Message.Should().Contain("already exists");
        }

        [Fact]
        public async Task EditLocation_NonExistentLocation_ReturnsFalse()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);

            var updateDto = new UpdateLocationDto { Zone = "AAAA", Col = "0001", Shelf = "0101" };

            var result = await service.UpdateLocationAsync(99999, updateDto);

            result.Should().BeFalse();
        }

        #endregion

        #region Activation

        [Fact]
        public async Task StatusLocation_Deactivate_Success()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");

            var result = await service.DeactivateLocationAsync(location.Id);

            result.Should().BeTrue();
            var deactivated = await service.GetLocationByIdAsync(location.Id);
            deactivated!.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task StatusLocation_Activate_Success()
        {
            using var context = _fixture.CreateContext();
            var service = new LocationService(context);
            var location = TestDataSeeder.CreateTestLocation(context, "AAAA-0001-0101");
            await service.DeactivateLocationAsync(location.Id);

            var result = await service.ActivateLocationAsync(location.Id);

            result.Should().BeTrue();
            var activated = await service.GetLocationByIdAsync(location.Id);
            activated!.IsActive.Should().BeTrue();
        }

        #endregion

    }
}
