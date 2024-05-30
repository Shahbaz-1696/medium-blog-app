import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@shahbaz16ansari/medium-common";


export const blogRouter = new Hono<{
    Bindings: {
        JWT_SECRET: string;
        DATABASE_URL: string;
    },
    Variables: {
        userId: string;
    }
}>();

blogRouter.use("/*", async (c, next) => {
    const authHeader = c.req.header("authorization") || "";
    
    try {
        const user = await verify(authHeader, c.env.JWT_SECRET);
        if(user) {
            c.set("userId", user.id);
            await next();
        } else {
            c.status(403);
            return c.json({
                message: "You are not logged in",
            })
         }
    } catch (e) {
        console.log(e);
        c.status(403);
        return c.json({
            message: "You are not logged in",
        })
    }
})

blogRouter.post('/', async (c) => {
    const body = await c.req.json();
    const { success } = createBlogInput.safeParse(body);

    if(!success) {
        c.status(411);
        return c.json({
            message: "Inputs not correct",
        })
    }
    const authorId = c.get("userId");
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const blog = await prisma.post.create({
        data: {
            title: body.title,
            content: body.content,
            published: body.published,
            authorId: authorId,
        }
    })
    
    return c.json({
        id: blog.id,
    })
});
  
blogRouter.put('/', async (c) => {
    const body = await c.req.json();
    const { success } = updateBlogInput.safeParse(body);

    if(!success) {
        c.status(411);
        return c.json({
            message: "Inputs not correct",
        })
    }
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const updatedBlog = await prisma.post.update({
        where: {
            id: body.id,
        }, 
        data: {
            title: body.title,
            content: body.content,
            published: body.published,
        }
    })
    return c.json({
        id: updatedBlog.id,
    })
});

blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const blogs = await prisma.post.findMany({
        select: {
            title: true,
            id: true,
            content: true,
            author: {
                select: {
                    name: true,
                }
            }
        }
    })
    
    return c.json({
        blogs,
    })
});
  
blogRouter.get('/:id', async (c) => {
    const id = c.req.param("id");
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    try {
        const blog = await prisma.post.findFirst({
            where: {
                id: id,
            },
            select: {
                id: true,
                title: true,
                content: true,
                author: {
                    select: {
                        name: true,
                    }
                }
            }
        })
        return c.json({
            blog,
        })
    } catch (error) {
        console.log(error);
        c.status(411);
        return c.json({
            message: "Error while fetching the blog post",
        })
    }

    
});
  

