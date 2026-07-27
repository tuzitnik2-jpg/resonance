import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

// JwtModule is registered globally in AppModule, so JwtService is already
// available for injection here without a local import.
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
