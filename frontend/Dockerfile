FROM node:22

WORKDIR /app

COPY package.json ./
# Don't copy package-lock.json:
# 	- to force npm to regenerate lockfile, resolving dependencies correctly for the container’s platform
#	- prevents issue below
#		package-lock.json was generated outside Docker
#		and pins platform-specific dependencies (like Rollup binaries)
#		that don’t match the Linux environment inside the container.
#	- issue above is specific for Vite/Rollup
#		Rollup distributes platform-specific

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
# Add '--host' because by default Vite only listens on the container's localhost (127.0.0.1),
#	which makes it unreachable from the host machine.
