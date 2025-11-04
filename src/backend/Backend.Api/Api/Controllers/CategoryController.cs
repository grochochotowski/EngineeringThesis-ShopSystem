using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // .../api/Categories
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
        public async Task<ActionResult<PagedResult<GetCategoryDto>>> GetAll([FromQuery] PaginationParams pagination, CancellationToken ct)
        {
            var list = await _service.GetAllAsync(pagination, ct);
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

        // --- DELETE CATEGORY ---
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] bool force = false, CancellationToken ct = default)
        {
            var (canDelete, message) = await _service.DeleteAsync(id, force, ct);
            if (!canDelete && message is not null)
                return Conflict(new { message });

            return NoContent();
        }
    }
}