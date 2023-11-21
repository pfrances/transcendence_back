export class LeaveChat {
  userId: number;
  chatId: number;

  constructor(data: LeaveChat) {
    this.userId = data.userId;
    this.chatId = data.chatId;
  }
}
