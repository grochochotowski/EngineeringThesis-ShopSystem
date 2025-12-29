using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InventoryChangeController : ControllerBase
    {
        private readonly IInventoryChangeService _service;

        public InventoryChangeController(IInventoryChangeService service)
        {
            _service = service;
        }

        // --- GET BY ID ---
        [HttpGet("{id}")]
        public async Task<ActionResult<GetInventoryChangeDto>> GetById(int id, CancellationToken ct)
        {
            var result = await _service.GetByIdAsync(id, ct);
            if (result == null)
                return NotFound(new { error = $"Inventory change {id} not found." });

            return Ok(result);
        }

        // --- GET ALL WITH FILTERS ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetInventoryChangeListItemDto>>> GetAll(
            [FromQuery] string? changeType = null,
            [FromQuery] int? productId = null,
            [FromQuery] int? locationId = null,
            [FromQuery] int? userId = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] string? q = null,
            [FromQuery] string? orderBy = null,
            [FromQuery] string? sortDirection = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            try
            {
                // Parse changeType string to enum
                InventoryChangeType? parsedChangeType = null;
                if (!string.IsNullOrWhiteSpace(changeType))
                {
                    if (Enum.TryParse<InventoryChangeType>(changeType, true, out var result))
                        parsedChangeType = result;
                    else
                        return BadRequest(new { error = $"Invalid changeType: {changeType}. Valid values: Add, Remove, Move, Sell, Return, Collect, Send" });
                }

                var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
                var changes = await _service.GetAllAsync(
                    parsedChangeType,
                    productId,
                    locationId,
                    userId,
                    from,
                    to,
                    q,
                    orderBy,
                    sortDirection,
                    pagination,
                    ct);

                return Ok(changes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // --- GET BY PRODUCT ID ---
        [HttpGet("product/{productId}")]
        public async Task<ActionResult<PagedResult<GetInventoryChangeListItemDto>>> GetByProduct(
            int productId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            try
            {
                var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
                var changes = await _service.GetByProductIdAsync(productId, pagination, ct);
                return Ok(changes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // --- GET BY LOCATION ID ---
        [HttpGet("location/{locationId}")]
        public async Task<ActionResult<PagedResult<GetInventoryChangeListItemDto>>> GetByLocation(
            int locationId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            try
            {
                var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
                var changes = await _service.GetByLocationIdAsync(locationId, pagination, ct);
                return Ok(changes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
