using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // PATH: .../api/Shipments
    public class ShipmentsController : ControllerBase
    {
        private readonly IShipmentService _service;
        public ShipmentsController(IShipmentService service) => _service = service;

        // --- GET ALL SHIPMENTS (pagination & filters) ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetShipmentListItemDto>>> GetAll(
            [FromQuery] string? q,
            [FromQuery] ShipmentType? type,
            [FromQuery] ShipmentStatus? status,
            [FromQuery] DateTimeOffset? sendDateFrom,
            [FromQuery] DateTimeOffset? sendDateTo,
            [FromQuery] DateTimeOffset? deliveryDateFrom,
            [FromQuery] DateTimeOffset? deliveryDateTo,
            [FromQuery] string? orderBy,
            [FromQuery] string? sortDirection,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var result = await _service.GetAllAsync(
                q, type, status, sendDateFrom, sendDateTo, deliveryDateFrom, deliveryDateTo,
                orderBy, sortDirection, pagination, ct);
            return Ok(result);
        }

        // --- GET SHIPMENT BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetShipmentDto>> GetById(int id, CancellationToken ct)
        {
            var item = await _service.GetByIdAsync(id, ct);
            return item is null ? NotFound() : Ok(item);
        }

        // --- CREATE SHIPMENT ---
        [HttpPost]
        public async Task<ActionResult<GetShipmentDto>> Create([FromBody] CreateShipmentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var created = await _service.CreateAsync(dto, ct);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- UPDATE SHIPMENT ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateShipmentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                await _service.UpdateAsync(id, dto, ct);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- UPDATE STATUS ONLY ---
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateShipmentStatusDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                await _service.UpdateStatusAsync(id, dto, ct);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- ADD PRODUCTS TO SHIPMENT ---
        [HttpPost("{id:int}/products")]
        public async Task<IActionResult> AddProducts(int id, [FromBody] AddProductsToShipmentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                await _service.AddProductsAsync(id, dto.Products, ct);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- REMOVE PRODUCTS FROM SHIPMENT ---
        [HttpDelete("{id:int}/products")]
        public async Task<IActionResult> RemoveProducts(int id, [FromBody] RemoveProductsFromShipmentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                await _service.RemoveProductsAsync(id, dto.ProductIds, ct);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // --- DELETE SHIPMENT ---
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            try
            {
                await _service.DeleteAsync(id, ct);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // --- COMPLETE COLLECTION (incoming shipments) ---
        [HttpPost("{id:int}/complete-collection")]
        public async Task<IActionResult> CompleteCollection(int id, [FromBody] CompleteCollectionDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                // Get userId from JWT claims
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !int.TryParse(userIdClaim, out int userId))
                    return Unauthorized(new { message = "User ID not found in token" });

                await _service.CompleteCollectionAsync(id, dto, userId, ct);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- GET SHIPMENT PRODUCT COLLECTION DATA ---
        [HttpGet("{id:int}/collection")]
        public async Task<ActionResult<List<GetShipmentProductCollectionGroupedDto>>> GetCollection(int id, CancellationToken ct)
        {
            try
            {
                var data = await _service.GetShipmentProductCollectionAsync(id, ct);
                return Ok(data);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }
}
