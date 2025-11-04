using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // /api/warehouses
    public class WarehouseController : ControllerBase
    {
        private readonly IWarehouseService _service;
        public WarehouseController(IWarehouseService service) => _service = service;

        // --- CREATE WAREHOUSE ---
        [HttpPost]
        public async Task<ActionResult<GetWarehouseDto>> Create([FromBody] CreateWarehouseDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var created = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        // --- GET WAREHOUSE BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetWarehouseDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var w = await _service.GetByIdAsync(id, ct);
            return w is null ? NotFound() : Ok(w);
        }

        // --- GET ALL WAREHOUSES ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetWarehouseDto>>> GetAll(
            [FromQuery] PaginationParams pagination,
            [FromQuery] string? search,
            CancellationToken ct)
        {
            var result = await _service.GetAllAsync(pagination, search, ct);
            return Ok(result);
        }

        // --- UPDATE WAREHOUSE ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateWarehouseDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var ok = await _service.UpdateAsync(id, dto, ct);
            return ok ? NoContent() : NotFound();
        }

        // --- DELETE WAREHOUSE ---
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var ok = await _service.DeleteAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }

        // --- GET PRODUCT BY ID FROM WAREHOUSE ---
        [HttpGet("{warehouseId:int}/products/{productId:int}")]
        public async Task<ActionResult<GetWarehouseProductItemDto>> GetProductById([FromRoute] int productId, [FromRoute] int warehouseId, CancellationToken ct)
        {
            var item = await _service.GetProductByIdAsync(productId, warehouseId, ct);
            return item is null ? NotFound() : Ok(item);
        }

        // --- GET PRODUCTS FROM WAREHOUSE ---
        [HttpGet("{warehouseId:int}/products")]
        public async Task<ActionResult<PagedResult<GetWarehouseProductItemDto>>> GetProductsFromWarehouse(
            [FromRoute] int warehouseId,
            [FromQuery] PaginationParams pagination,
            [FromQuery] string? search,
            CancellationToken ct)
        {
            var result = await _service.GetProductsFromWarehouseAsync(warehouseId, pagination, search, ct);
            return Ok(result);
        }

        // --- ADD PRODUCT TO WAREHOUSE ---
        [HttpPost("{warehouseId:int}/products")]
        public async Task<IActionResult> AddProduct([FromRoute] int warehouseId, [FromBody] AddProductToWarehouseDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            await _service.AddProductToWarehouseAsync(warehouseId, dto, ct);
            return NoContent();
        }

        // --- REMOVE PRODUCT FROM WAREHOUSE ---
        [HttpDelete("{warehouseId:int}/products")]
        public async Task<IActionResult> RemoveProduct([FromRoute] int warehouseId, [FromBody] RemoveProductFromWarehouseDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            await _service.RemoveProductFromWarehouseAsync(warehouseId, dto, ct);
            return NoContent();
        }
    }
}