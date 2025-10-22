using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    [ApiController]
    [Route("api/parcels")]
    public sealed class ParcelsController : ControllerBase
    {
        private readonly IParcelsService _service;
        public ParcelsController(IParcelsService service) => _service = service;

        [HttpPost]
        public async Task<ActionResult<GetParcelDto>> Create([FromBody] CreateParcelDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
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

        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetParcelDto>> GetById(int id, CancellationToken ct)
        {
            var item = await _service.GetByIdAsync(id, ct);
            return item is null ? NotFound() : Ok(item);
        }

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<GetParcelDto>>> GetAll(
            [FromQuery] string? q,
            [FromQuery] int? shipmentId,
            CancellationToken ct = default)
        {
            var list = await _service.GetAllAsync(q, shipmentId, ct);
            return Ok(list);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateParcelDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            try
            {
                var ok = await _service.UpdateAsync(id, dto, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteAsync(id, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete parcel due to related data." });
            }
        }

        [HttpGet("{id:int}/products")]
        public async Task<ActionResult<GetParcelProductsDto>> GetProducts(int id, CancellationToken ct)
        {
            try
            {
                var res = await _service.GetProductsAsync(id, ct);
                return Ok(res);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("{id:int}/products")]
        public async Task<IActionResult> AddProduct(int id, [FromBody] AddProductToParcelDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            try
            {
                var ok = await _service.AddProductAsync(id, dto, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}/products")]
        public async Task<IActionResult> RemoveProduct(int id, [FromBody] RemoveProductFromParcelDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var ok = await _service.RemoveProductAsync(id, dto, ct);
            return ok ? NoContent() : NotFound();
        }
    }
}