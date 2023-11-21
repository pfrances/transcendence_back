export class JoinChat {
  userId: number;
  chatId: number;
  password?: string;

  constructor(data: JoinChat) {
    this.userId = data.userId;
    this.chatId = data.chatId;
    this.password = data.password;
  }
}
