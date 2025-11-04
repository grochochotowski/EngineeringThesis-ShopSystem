using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // PATH: .../api/Shipments
    public class ShipmentController : ControllerBase
    {
        private readonly IShipmentService _service;
        public ShipmentController(IShipmentService service) => _service = service;

        // --- GET ALL SHIPMENTS (pagination & filters) ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetShipmentDto>>> GetAll(
            [FromQuery] string? q,
            [FromQuery] ShipmentType? type,
            [FromQuery] ShipmentStatus? status,
            [FromQuery] int? deliveryCompanyId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var result = await _service.GetAllAsync(q, type, status, deliveryCompanyId, pagination, ct);
            return Ok(result);
        }

        // --- GET SHIPMENT BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetShipmentDto>> GetById(int id, CancellationToken ct)
        {
            var item = await _service.GetByIdAsync(id, ct);
            return item is null ? NotFound() : Ok(item);
        }

        // --- GET PARCELS OF SHIPMENT ---
        [HttpGet("{id:int}/parcels")]
        public async Task<ActionResult<GetShipmentParcelsDto>> GetParcels(int id, CancellationToken ct)
        {
            var res = await _service.GetParcelsAsync(id, ct);
            return res is null ? NotFound() : Ok(res);
        }

        // --- CREATE SHIPMENT ---
        [HttpPost]
        public async Task<ActionResult<int>> Create([FromBody] CreateShipmentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var id = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id }, id);
        }

        // --- UPDATE SHIPMENT ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateShipmentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            await _service.UpdateAsync(id, dto, ct);
            return NoContent();
        }

        // --- UPDATE STATUS ONLY ---
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateShipmentStatusDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            await _service.UpdateStatusAsync(id, dto, ct);
            return NoContent();
        }

        // --- ADD PARCELS TO SHIPMENT ---
        [HttpPost("{id:int}/parcels")]
        public async Task<IActionResult> AddParcels(int id, [FromBody] AddParcelsToShipmentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            await _service.AddParcelsAsync(id, dto.ParcelIds, ct);
            return NoContent();
        }

        // --- REMOVE PARCELS FROM SHIPMENT ---
        [HttpDelete("{id:int}/parcels")]
        public async Task<IActionResult> RemoveParcels(int id, [FromBody] RemoveParcelsFromShipmentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            await _service.RemoveParcelsAsync(id, dto.ParcelIds, ct);
            return NoContent();
        }

        // --- DELETE SHIPMENT (cascade remove parcels) ---
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            await _service.DeleteAsync(id, ct);
            return NoContent();
        }
    }
}
