import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { SelectRequest } from "./shared/types/form/form";
import { Public } from "./shared/decorators/public.decorator";

@Public()
@Controller("api/select")
@UseGuards(ThrottlerGuard)
export class SelectController {
  constructor() { }

  @Get("payload")
  async select(@Query() query: SelectRequest) {
    if (query.payload === "country") {
      return {
        list: [
          { label: "Argentina", value: "ar" },
          { label: "Brasil", value: "br" },
          { label: "Chile", value: "cl" },
          { label: "Colombia", value: "co" },
          { label: "Ecuador", value: "ec" },
          { label: "Perú", value: "pe" },
        ],
      };
    } else if (query.payload === "state") {
      return {
        list: [
          { label: "Buenos Aires", value: "BA" },
          { label: "Catamarca", value: "CA" },
          { label: "Chaco", value: "CH" },
          { label: "Chubut", value: "CB" },
          { label: "Corrientes", value: "CN" },
          { label: "Entre Ríos", value: "ER" },
          { label: "Formosa", value: "FM" },
          { label: "Jujuy", value: "JU" },
          { label: "La Pampa", value: "LP" },
          { label: "La Rioja", value: "LR" },
          { label: "Mendoza", value: "MZ" },
          { label: "Misiones", value: "MS" },
          { label: "Neuquén", value: "NQ" },
          { label: "Río Negro", value: "RN" },
          { label: "Salta", value: "SA" },
          { label: "San Juan", value: "SJ" },
          { label: "San Luis", value: "SL" },
          { label: "Santa Cruz", value: "SC" },
          { label: "Santa Fe", value: "SF" },
          { label: "Santiago del Estero", value: "SE" },
          { label: "Tierra del Fuego", value: "TF" },
          { label: "Tucumán", value: "TU" },
        ],
      };
    } else if (query.payload === "permit") {
      return {
        list: [
          { label: "SUPERADMIN", value: "SUPERADMIN" },
          { label: "ADMIN", value: "ADMIN" },
          { label: "USER", value: "USER" },
        ],
      };
    }
  }
}
