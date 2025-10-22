using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ShipmentController : ControllerBase
    {
        private readonly IShipmentService _service;
        public ShipmentController(IShipmentService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<GetShipmentDto>>> GetAll(CancellationToken ct)
            => Ok(await _service.GetAllAsync(ct));

        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetShipmentDto>> GetById(int id, CancellationToken ct)
        {
            var item = await _service.GetByIdAsync(id, ct);
            return item is null ? NotFound() : Ok(item);
        }

        [HttpGet("{id:int}/parcels")]
        public async Task<ActionResult<GetShipmentParcelsDto>> GetParcels(int id, CancellationToken ct)
        {
            var res = await _service.GetParcelsAsync(id, ct);
            return res is null ? NotFound() : Ok(res);
        }

        [HttpPost]
        public async Task<ActionResult<int>> Create([FromBody] CreateShipmentDto dto, CancellationToken ct)
        {
            var id = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id }, id);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateShipmentDto dto, CancellationToken ct)
        {
            await _service.UpdateAsync(id, dto, ct);
            return NoContent();
        }

        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateShipmentStatusDto dto, CancellationToken ct)
        {
            await _service.UpdateStatusAsync(id, dto, ct);
            return NoContent();
        }

        [HttpPost("{id:int}/parcels")]
        public async Task<IActionResult> AddParcels(int id, [FromBody] AddParcelsToShipmentDto dto, CancellationToken ct)
        {
            await _service.AddParcelsAsync(id, dto.ParcelIds, ct);
            return NoContent();
        }

        [HttpDelete("{id:int}/parcels")]
        public async Task<IActionResult> RemoveParcels(int id, [FromBody] RemoveParcelsFromShipmentDto dto, CancellationToken ct)
        {
            await _service.RemoveParcelsAsync(id, dto.ParcelIds, ct);
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            await _service.DeleteAsync(id, ct);
            return NoContent();
        }
    }
}