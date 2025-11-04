using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // PATH: .../api/Parcels
    public sealed class ParcelsController : ControllerBase
    {
        private readonly IParcelsService _service;
        public ParcelsController(IParcelsService service) => _service = service;

        // --- CREATE PARCEL ---
        [HttpPost]
        public async Task<ActionResult<GetParcelDto>> Create([FromBody] CreateParcelDto dto, CancellationToken ct)
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

        // --- GET PARCEL BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetParcelDto>> GetById(int id, CancellationToken ct)
        {
            var item = await _service.GetByIdAsync(id, ct);
            return item is null ? NotFound() : Ok(item);
        }

        // --- GET ALL PARCELS (pagination & filters) ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetParcelDto>>> GetAll(
            [FromQuery] string? q,
            [FromQuery] int? shipmentId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var result = await _service.GetAllAsync(q, shipmentId, pagination, ct);
            return Ok(result);
        }

        // --- UPDATE PARCEL ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateParcelDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

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

        // --- DELETE PARCEL ---
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteAsync(id, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- GET PRODUCTS INSIDE A PARCEL (pagination) ---
        [HttpGet("{id:int}/products")]
        public async Task<ActionResult<PagedResult<ParcelProductItemDto>>> GetProducts(
            int id,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            try
            {
                var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
                var result = await _service.GetProductsAsync(id, pagination, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Parcel not found." });
            }
        }

        // --- ADD PRODUCT TO PARCEL ---
        [HttpPost("{id:int}/products")]
        public async Task<IActionResult> AddProduct(int id, [FromBody] AddProductToParcelDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

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

        // --- REMOVE PRODUCT FROM PARCEL ---
        [HttpDelete("{id:int}/products")]
        public async Task<IActionResult> RemoveProduct(int id, [FromBody] RemoveProductFromParcelDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var ok = await _service.RemoveProductAsync(id, dto, ct);
            return ok ? NoContent() : NotFound();
        }
    }
}