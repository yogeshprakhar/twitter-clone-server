import axios from "axios";
import { prismaClient } from "../../clients/db";
import JWTService from "../../services/jwt";
import { GraphqlContext } from "../../interface";
import { User } from "@prisma/client";
import UserService from "../../services/user";
import { PrismaClientValidationError } from "@prisma/client/runtime/library";

const queries = {
  verifyGoogleToken: async (parent: any, { token }: { token: string }) => {
    const resultToken = UserService.verifyGoogleAuthToken(token);
    return resultToken;
  },

  getCurrentUser: async (parent: any, args: any, ctx: GraphqlContext) => {
    // console.log(ctx)
    const id = ctx.user?.id;
    if (!id) return null;

    const user = UserService.getUserById(id);
    return user;
  },

  getUserById: async (
    parent: any,
    { id }: { id: string },
    ctx: GraphqlContext
  ) => UserService.getUserById(id),
};

const extraResolvers = {
  User: {
    tweets: (parent: User) =>
      prismaClient.tweet.findMany({ where: { author: { id: parent.id } } }),
    followers: async (parent: User) => {
      const result = await prismaClient.follows.findMany({
        where: { following: { id: parent.id } },
        include: {
          follower: true,
        },
      });
      return result.map((el) => el.follower);
    },
    following: async (parent: User) => {
      const result = await prismaClient.follows.findMany({
        where: { follower: { id: parent.id } },
        include: {
          following: true,
        },
      });
      // console.log("Result!! is == ",result)
      return result.map((el) => el.following);
    },
    recommendedUsers: async (parent: User, _: any, ctx: GraphqlContext) => {
      if (!ctx.user) return [];
      const myFollowings = await prismaClient.follows.findMany({
        where: {
          follower: { id: ctx.user.id },
        },
        include: {
          following: {
            include: { followers: { include: { following: true } } },
          },
        },
      });
      const user: User[] = [];
      // console.log("my following = ", myFollowings);
      for (const followings of myFollowings) {
        for (const followingOfFollowedUser of followings.following.followers) {
          if (
            followingOfFollowedUser.followingId !== ctx.user.id &&
            myFollowings.findIndex(
              (e) => e.followingId === followingOfFollowedUser.following.id
            ) < 0
          ) {
            user.push(followingOfFollowedUser.following);
          }
        }
      }
      return user;
    },
  },
};

const mutations = {
  followUser: async (
    parent: any,
    { to }: { to: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) throw new Error("Unauthenticated");
    await UserService.followUser(ctx.user.id, to);
    return true;
  },

  unfollowUser: async (
    parent: any,
    { to }: { to: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) throw new Error("Unauthenticated");
    await UserService.unfollowUser(ctx.user.id, to);
    return true;
  },
};

export const resolvers = { queries, extraResolvers, mutations };
