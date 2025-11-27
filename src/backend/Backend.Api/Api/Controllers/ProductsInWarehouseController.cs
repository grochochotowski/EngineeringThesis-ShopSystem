using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/products-in-warehouse")]
    public class ProductsInWarehouseController : ControllerBase
    {
        private readonly IProductsInWarehouseService _service;
        public ProductsInWarehouseController(IProductsInWarehouseService service) => _service = service;

        // --- ADD PRODUCT TO LOCATION ---
        [HttpPost("add")]
        public async Task<IActionResult> AddProductToLocation([FromBody] AddProductToLocationDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                await _service.AddProductToLocationAsync(dto.ProductId, dto.LocationId, dto.Quantity, ct);
                return Ok(new { message = "Product added to location successfully." });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // --- REMOVE PRODUCT FROM LOCATION ---
        [HttpPost("remove")]
        public async Task<IActionResult> RemoveProductFromLocation([FromBody] RemoveProductFromLocationDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                await _service.RemoveProductFromLocationAsync(dto.ProductId, dto.LocationId, dto.Quantity, ct);
                return Ok(new { message = "Product removed from location successfully." });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // --- SEARCH PRODUCT ---
        [HttpGet("search-product")]
        public async Task<ActionResult<PagedResult<ProductSearchResultDto>>> SearchProduct(
            [FromQuery] string? searchTerm,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var result = await _service.SearchProductAsync(searchTerm, pagination, ct);
            return Ok(result);
        }

        // --- SEARCH PRODUCT-LOCATION ROWS (WITH FILTERS) ---
        [HttpGet("search-product-rows")]
        public async Task<ActionResult<PagedResult<ProductLocationRowDto>>> SearchProductRows(
            [FromQuery] string? searchTerm,
            [FromQuery] int? categoryId,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] int? minQuantity,
            [FromQuery] int? maxQuantity,
            [FromQuery] string? orderBy,
            [FromQuery] string? sortDirection,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 50,
            CancellationToken ct = default)
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var result = await _service.SearchProductLocationRowsAsync(
                searchTerm, categoryId, minPrice, maxPrice, minQuantity, maxQuantity,
                orderBy, sortDirection, pagination, ct);
            return Ok(result);
        }

        // --- SEARCH PRODUCTS WITH LOCATIONS (AGGREGATED) ---
        /// <summary>
        /// Returns unique products with aggregated quantities and location breakdowns.
        /// Each product appears once with total quantity across all locations.
        /// </summary>
        [HttpGet("search-products-with-locations")]
        public async Task<ActionResult<PagedResult<ProductWithLocationsDto>>> SearchProductsWithLocations(
            [FromQuery] string? searchTerm,
            [FromQuery] int? categoryId,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] int? minQuantity,
            [FromQuery] int? maxQuantity,
            [FromQuery] string? orderBy,
            [FromQuery] string? sortDirection,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 50,
            CancellationToken ct = default)
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var result = await _service.SearchProductsWithLocationsAsync(
                searchTerm, categoryId, minPrice, maxPrice, minQuantity, maxQuantity,
                orderBy, sortDirection, pagination, ct);
            return Ok(result);
        }

        // --- SEARCH BY LOCATION ---
        [HttpGet("search-location")]
        public async Task<ActionResult<PagedResult<LocationProductsResultDto>>> SearchByLocation(
            [FromQuery] string locationCodePart,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(locationCodePart))
                return BadRequest(new { message = "Location code part is required." });

            try
            {
                var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
                var result = await _service.SearchByLocationAsync(locationCodePart, pagination, ct);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
