import { bookingController } from "../../../lib/controllers/bookingController";

export async function GET(req: Request) {
  return bookingController.getBookings(req);
}

export async function POST(req: Request) {
  return bookingController.createBooking(req);
}

export async function PUT(req: Request) {
  return bookingController.cancelBooking(req);
}
