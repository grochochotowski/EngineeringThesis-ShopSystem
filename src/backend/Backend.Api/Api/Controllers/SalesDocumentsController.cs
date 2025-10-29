using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Api.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SalesDocumentsController : ControllerBase
    {
        private readonly ISalesDocumentService _service;
        public SalesDocumentsController(ISalesDocumentService service) => _service = service;

        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetSalesDocumentDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto is null ? NotFound() : Ok(dto);
        }

        [HttpPost]
        public async Task<ActionResult<int>> Create([FromBody] CreateSalesDocumentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var id = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id }, id);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateHeader(int id, [FromBody] UpdateSalesDocumentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            await _service.UpdateHeaderAsync(id, dto, ct);
            return NoContent();
        }
    }
}