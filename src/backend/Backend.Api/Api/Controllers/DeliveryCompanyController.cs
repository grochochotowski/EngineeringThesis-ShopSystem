using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // PATH: .../api/DeliveryCompanies
    public sealed class DeliveryCompaniesController : ControllerBase
    {
        private readonly IDeliveryCompaniesService _service;
        public DeliveryCompaniesController(IDeliveryCompaniesService service) => _service = service;

        // --- CREATE DELIVERY COMPANY ---
        [HttpPost]
        public async Task<ActionResult<GetDeliveryCompanyDto>> Create([FromBody] CreateDeliveryCompanyDto dto, CancellationToken ct)
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

        // --- GET DELIVERY COMPANY BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetDeliveryCompanyDto>> GetById(int id, CancellationToken ct)
        {
            var item = await _service.GetByIdAsync(id, ct);
            return item is null ? NotFound() : Ok(item);
        }

        // --- GET ALL DELIVERY COMPANIES (paginated and filter) ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetDeliveryCompanyDto>>> GetAll(
            [FromQuery] string? q,
            [FromQuery] bool? isActive,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var result = await _service.GetAllAsync(q, isActive, pagination, ct);
            return Ok(result);
        }

        // --- UPDATE DELIVERY COMPANY ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateDeliveryCompanyDto dto, CancellationToken ct)
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

        // --- DEACTIVATE DELIVERY COMPANY ---
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Deactivate(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeactivateAsync(id, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- RESTORE DELIVERY COMPANY ---
        [HttpPost("{id:int}/restore")]
        public async Task<IActionResult> Restore(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.RestoreAsync(id, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }
    }
}