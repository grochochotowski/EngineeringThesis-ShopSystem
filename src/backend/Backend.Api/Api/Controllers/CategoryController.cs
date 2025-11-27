using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // PATH: .../api/Categories
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryService _service;
        public CategoriesController(ICategoryService service) => _service = service;

        // --- CREATE CATEGORY ---
        [HttpPost]
        public async Task<ActionResult<GetCategoryDto>> Create([FromBody] CreateCategoryDto dto, CancellationToken ct)
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

        // --- GET CATEGORY BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetCategoryDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var cat = await _service.GetByIdAsync(id, ct);
            return cat is null ? NotFound() : Ok(cat);
        }

        // --- GET ALL CATEGORIES (paginated) ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetCategoryDto>>> GetAll([FromQuery] PaginationParams pagination, [FromQuery] bool? isActive = null, [FromQuery] string? orderBy = null, [FromQuery] string? sortDirection = null, CancellationToken ct = default)
        {
            var list = await _service.GetAllAsync(pagination, isActive, orderBy, sortDirection, ct);
            return Ok(list);
        }

        // --- UPDATE CATEGORY ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateCategoryDto dto, CancellationToken ct)
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

        // --- DEACTIVATE CATEGORY ---
        [HttpPut("{id:int}/deactivate")]
        public async Task<IActionResult> Deactivate(int id, CancellationToken ct = default)
        {
            try
            {
                var result = await _service.DeactivateAsync(id, ct);
                return result ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- ACTIVATE CATEGORY ---
        [HttpPut("{id:int}/activate")]
        public async Task<IActionResult> Activate(int id, CancellationToken ct = default)
        {
            var result = await _service.ActivateAsync(id, ct);
            return result ? NoContent() : NotFound();
        }
    }
}