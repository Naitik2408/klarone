import { Controller, Get, Param } from "@nestjs/common";
import { CustomersService } from "./customers.service";

@Controller("customers")
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
  ) {}

  @Get(":userAccountId")
  async findById(
    @Param("userAccountId") userAccountId: string,
  ) {
    return this.customersService.findById(
      BigInt(userAccountId),
    );
  }
}